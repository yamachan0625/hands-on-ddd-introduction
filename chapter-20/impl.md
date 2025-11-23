# Outbox パターン - 実装編

本ページでは、「第 20 章 Outbox パターン」で説明した設計を、実際のコードで実装していきます。Outbox パターンの概念や設計については書籍を参照してください。

## 実装の流れ

実装は以下の順序で進めていきます。

1. Event テーブルの設計と作成
2. イベントストアの実装
3. Review アプリケーションサービスの修正
4. メッセージリレーの実装
5. 動作確認

## 1. Event テーブルの設計と作成

まずはドメインイベントを永続化するための Event テーブル(Outbox テーブル) を作成します。このテーブルは DomainEvent クラスの属性をそのまま保存できる構造とします。

### 1.1 SQL 定義の作成

`src/Infrastructure/SQL/migrations`ディレクトリに`create_event_table.sql`ファイルを作成し、以下の SQL 定義を記述します。

```sql:CatalogService/src/Infrastructure/SQL/migrations/create_event_table.sql
-- Event テーブル(Outbox テーブル)の作成
CREATE TABLE IF NOT EXISTS "Event" (
  "eventId" TEXT PRIMARY KEY,
  "aggregateId" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventBody" JSONB NOT NULL,
  "occurredOn" TIMESTAMP WITH TIME ZONE NOT NULL,
  "publishedAt" TIMESTAMP WITH TIME ZONE
);

-- 未発行イベントの検索とソートを同時最適化する複合インデックス
-- NULLS FIRSTによりpublishedAt IS NULLの検索を最適化し、occurredOnでのソートも高速化
CREATE INDEX IF NOT EXISTS "Event_unpublished_occurredOn_idx" ON "Event"("publishedAt" ASC NULLS FIRST, "occurredOn" ASC);
```

未発行イベント（`publishedAt` が NULL）の検索とソート処理を同時に最適化する複合インデックスを追加しています。

### 1.2 マイグレーションの実行

`node-postgres` を使用して `Event` テーブルのマイグレーションを実行します。

```bash:CatalogService
$ npx ts-node src/Infrastructure/SQL/migrations/runMigrations.ts create_event_table.sql
```

これにより、`Event` テーブルが作成されました。

## 2. イベントストアの実装

次に、`Event`テーブルに対する操作を行うリポジトリを実装します。

### 2.1 インターフェイスの定義

まずはインターフェイスを定義します。`src/Domain/shared/DomainEvent`配下に`IEventStoreRepository.ts`ファイルを作成し、以下のように実装します。

```typescript:CatalogService/src/Domain/shared/DomainEvent/IEventStoreRepository.ts
import { Aggregate } from '../Aggregate';
import { DomainEvent } from './DomainEvent';

export interface IEventStoreRepository {
  // 未発行のイベントを取得
  findPendingEvents(): Promise<DomainEvent[]>;
  // 集約からイベントを保存
  store(aggregate: Aggregate<DomainEvent>): Promise<void>;
  // イベントを発行済みとしてマーク
  markAsPublished(event: DomainEvent): Promise<void>;
}
```

### 2.2 SQL 実装

このインターフェイスの実装を `node-postgres` を使って行います。`src/Infrastructure/SQL`配下に`EventStore`ディレクトリを作成します。次に、`SQLEventStoreRepository.ts`ファイルを作成し、以下のように実装します。

```typescript:CatalogService/src/Infrastructure/SQL/EventStore/SQLEventStoreRepository.ts
import { injectable } from 'tsyringe';

import { Aggregate } from 'Domain/shared/Aggregate';
import { DomainEvent } from 'Domain/shared/DomainEvent/DomainEvent';
import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

import { SQLClientManager } from '../SQLClientManager';

@injectable()
export class SQLEventStoreRepository implements IEventStoreRepository {
  constructor(private clientManager: SQLClientManager) {}

  async findPendingEvents(): Promise<DomainEvent[]> {
    return await this.clientManager.withClient(async (client) => {
      const query = `
        SELECT
          "eventId",
          "aggregateId",
          "aggregateType",
          "eventType",
          "eventBody",
          "occurredOn",
          "publishedAt"
        FROM "Event"
        WHERE "publishedAt" IS NULL
        ORDER BY "occurredOn" ASC
      `;

      const result = await client.query(query);

      return result.rows.map((row) =>
        DomainEvent.reconstruct(
          row.eventId,
          row.aggregateId,
          row.aggregateType,
          row.eventType,
          row.eventBody,
          row.occurredOn,
          row.publishedAt
        )
      );
    });
  }

  async store(aggregate: Aggregate<DomainEvent>): Promise<void> {
    await this.clientManager.withClient(async (client) => {
      const events = aggregate.getDomainEvents();

      for (const event of events) {
        const query = `
          INSERT INTO "Event" (
            "eventId",
            "aggregateId",
            "aggregateType",
            "eventType",
            "eventBody",
            "occurredOn",
            "publishedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        const values = [
          event.eventId,
          event.aggregateId,
          event.aggregateType,
          event.eventType,
          JSON.stringify(event.eventBody),
          event.occurredOn,
          event.publishedAt,
        ];

        await client.query(query, values);
      }
      aggregate.clearDomainEvents();
    });
  }

  async markAsPublished(event: DomainEvent): Promise<void> {
    await this.clientManager.withClient(async (client) => {
      const query = `
        UPDATE "Event"
        SET "publishedAt" = $1
        WHERE "eventId" = $2
      `;

      const values = [event.publishedAt, event.eventId];

      await client.query(query, values);
    });
  }
}
```

### 2.3 DI コンテナーへの登録

実装したリポジトリを DI コンテナーに登録しましょう。

```typescript:CatalogService/src/Program.ts
import { container } from 'tsyringe';

import {
    EventEmitterDomainEventPublisher
} from 'Infrastructure/EventEmitter/EventEmitterDomainEventPublisher';
import {
    EventEmitterDomainEventSubscriber
} from 'Infrastructure/EventEmitter/EventEmitterDomainEventSubscriber';
import { SQLBookRepository } from 'Infrastructure/SQL/Book/SQLBookRepository';
import { SQLEventStoreRepository } from 'Infrastructure/SQL/EventStore/SQLEventStoreRepository';
import { SQLReviewRepository } from 'Infrastructure/SQL/Review/SQLReviewRepository';
import { SQLTransactionManager } from 'Infrastructure/SQL/SQLTransactionManager';

// DomainEvent
container.register("IDomainEventPublisher", {
  useClass: EventEmitterDomainEventPublisher,
});
container.register("IDomainEventSubscriber", {
  useClass: EventEmitterDomainEventSubscriber,
});

// repository
container.register("IBookRepository", {
  useClass: SQLBookRepository,
});

container.register("IReviewRepository", {
  useClass: SQLReviewRepository,
});

container.register("IEventStoreRepository", {
  useClass: SQLEventStoreRepository,
});

// transactionManager
container.register("ITransactionManager", {
  useClass: SQLTransactionManager,
});

```

### 2.4 テスト用の InMemoryEventStoreRepository の実装

SQL 用の実装と並行して、テストやローカル開発で利用する InMemory の EventStoreRepository も実装しましょう。`src/Infrastructure/InMemory`配下に`EventStore`ディレクトリを作成します。次に、`InMemoryEventStoreRepository.ts`ファイルを作成して以下のように実装します。

```typescript:CatalogService/src/Infrastructure/InMemory/EventStore/InMemoryEventStoreRepository.ts
import { Aggregate } from 'Domain/shared/Aggregate';
import { DomainEvent } from 'Domain/shared/DomainEvent/DomainEvent';
import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

export class InMemoryEventStoreRepository implements IEventStoreRepository {
  private events: DomainEvent[] = [];

  async findPendingEvents(): Promise<DomainEvent[]> {
    return this.events.filter((event) => event.publishedAt === null);
  }

  async store(aggregate: Aggregate<DomainEvent>): Promise<void> {
    const domainEvents = aggregate.getDomainEvents();
    for (const event of domainEvents) {
      this.events.push(event);
    }
    aggregate.clearDomainEvents();
  }

  async markAsPublished(event: DomainEvent): Promise<void> {
    const storedEvent = this.events.find((e) => e.eventId === event.eventId);
    if (storedEvent) {
      storedEvent.publish();
    }
  }
}
```

### 2.5 TestProgram.ts への登録

テスト環境では、InMemoryEventStoreRepository を使用するように`TestProgram.ts`に登録します。

```typescript:CatalogService/src/TestProgram.ts
import { container } from 'tsyringe';

import { MockDomainEventPublisher } from 'Application/shared/DomainEvent/MockDomainEventPublisher';
import { MockTransactionManager } from 'Application/shared/MockTransactionManager';
import { InMemoryBookRepository } from 'Infrastructure/InMemory/Book/InMemoryBookRepository';
import {
    InMemoryEventStoreRepository
} from 'Infrastructure/InMemory/InMemory/InMemoryEventStoreRepository';
import { InMemoryReviewRepository } from 'Infrastructure/InMemory/Review/InMemoryReviewRepository';

// DomainEvent
container.register("IDomainEventPublisher", {
  useClass: MockDomainEventPublisher,
});

// Repository registrations
container.register("IBookRepository", {
  useClass: InMemoryBookRepository,
});

container.register("IReviewRepository", {
  useClass: InMemoryReviewRepository,
});

container.register("IEventStoreRepository", {
  useClass: InMemoryEventStoreRepository,
});

// TransactionManager registration
container.register("ITransactionManager", {
  useClass: MockTransactionManager,
});
```

## 3. Review アプリケーションサービスの修正

次に、アプリケーションサービスを修正します。これまで、ドメインイベントのパブリッシュはサービス内で直接行っていましたが、Outbox パターンの実装に伴い、パブリッシュ処理を削除し、イベントストアへの保存処理を追加します。

### 3.1 AddReviewService の修正

```typescript:CatalogService/src/Application/Review/AddReviewService/AddReviewService.ts
import { inject, injectable } from 'tsyringe';

import { ITransactionManager } from 'Application/shared/ITransactionManager';
import { BookId } from 'Domain/models/Book/BookId/BookId';
import { IBookRepository } from 'Domain/models/Book/IBookRepository';
import { Comment } from 'Domain/models/Review/Comment/Comment';
import { IReviewRepository } from 'Domain/models/Review/IReviewRepository';
import { Name } from 'Domain/models/Review/Name/Name';
import { Rating } from 'Domain/models/Review/Rating/Rating';
import { Review } from 'Domain/models/Review/Review';
import { ReviewId } from 'Domain/models/Review/ReviewId/ReviewId';
import { ReviewIdentity } from 'Domain/models/Review/ReviewIdentity/ReviewIdentity';
import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

import { AddReviewDTO } from './AddReviewDTO';

export type AddReviewCommand = {
  bookId: string;
  name: string;
  rating: number;
  comment?: string;
};

@injectable()
export class AddReviewService {
  constructor(
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("IBookRepository")
    private bookRepository: IBookRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager,
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository
  ) {}

  async execute(command: AddReviewCommand): Promise<AddReviewDTO> {
    // 対象の書籍が存在するか確認
    const book = await this.bookRepository.findById(new BookId(command.bookId));

    if (!book) {
      throw new Error("書籍が存在しません");
    }

    const review = await this.transactionManager.begin(async () => {
      const reviewId = new ReviewId();
      const reviewIdentity = new ReviewIdentity(reviewId);
      const name = new Name(command.name);
      const rating = new Rating(command.rating);
      const comment = command.comment
        ? new Comment(command.comment)
        : undefined;

      const review = Review.create(
        reviewIdentity,
        book.bookId,
        name,
        rating,
        comment
      );

      await this.reviewRepository.save(review);
      await this.eventStoreRepository.store(review);

      return review;
    });

    return {
      id: review.reviewId.value,
      bookId: review.bookId.value,
      name: review.name.value,
      rating: review.rating.value,
      comment: review.comment?.value,
    };
  }
}
```

### 3.2 EditReviewService の修正

```typescript:CatalogService/src/Application/Review/EditReviewService/EditReviewService.ts
import { inject, injectable } from 'tsyringe';

import { ITransactionManager } from 'Application/shared/ITransactionManager';
import { Comment } from 'Domain/models/Review/Comment/Comment';
import { IReviewRepository } from 'Domain/models/Review/IReviewRepository';
import { Name } from 'Domain/models/Review/Name/Name';
import { Rating } from 'Domain/models/Review/Rating/Rating';
import { ReviewId } from 'Domain/models/Review/ReviewId/ReviewId';
import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

import { EditReviewDTO } from './EditReviewDTO';

export type EditReviewCommand = {
  reviewId: string;
  name?: string;
  rating?: number;
  comment?: string;
};

@injectable()
export class EditReviewService {
  constructor(
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: EditReviewCommand): Promise<EditReviewDTO> {
    const review = await this.transactionManager.begin(async () => {
      // 対象のレビューを取得
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.reviewRepository.findById(reviewId);

      if (!review) {
        throw new Error("レビューが存在しません");
      }

      if (command.name !== undefined) {
        const name = new Name(command.name);
        review.updateName(name);
      }

      if (command.rating !== undefined) {
        const rating = new Rating(command.rating);
        review.updateRating(rating);
      }

      if (command.comment !== undefined) {
        const comment = new Comment(command.comment);
        review.editComment(comment);
      }

      await this.reviewRepository.update(review);
      await this.eventStoreRepository.store(review);

      return review;
    });

    return {
      id: review.reviewId.value,
      bookId: review.bookId.value,
      name: review.name.value,
      rating: review.rating.value,
      comment: review.comment?.value,
    };
  }
}
```

### 3.3 DeleteReviewService の修正

```typescript:CatalogService/src/Application/Review/DeleteReviewService/DeleteReviewService.ts
import { inject, injectable } from 'tsyringe';

import { ITransactionManager } from 'Application/shared/ITransactionManager';
import { IReviewRepository } from 'Domain/models/Review/IReviewRepository';
import { ReviewId } from 'Domain/models/Review/ReviewId/ReviewId';
import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

export type DeleteReviewCommand = {
  reviewId: string;
};

@injectable()
export class DeleteReviewService {
  constructor(
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: DeleteReviewCommand): Promise<void> {
    await this.transactionManager.begin(async () => {
      // 対象のレビューを取得して存在確認
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.reviewRepository.findById(reviewId);

      if (!review) {
        throw new Error("レビューが存在しません");
      }

      review.delete();

      await this.reviewRepository.delete(reviewId);
      await this.eventStoreRepository.store(review);

      return review;
    });
  }
}
```

## 4. メッセージリレーの実装

メッセージリレーは、Outbox テーブルに保存されたイベントを実際にパブリッシュする役割を担うコンポーネントです。

### 4.1 PendingEventsPublishService の実装

このサービスは以下の重要な役割を担います。

1. 未発行イベントの定期的な検出
2. メッセージブローカーへの安全なパブリッシュ
3. イベント発行状態の管理

それでは具体的な実装を見ていきましょう。`src/Application`配下に`EventStore`ディレクトリを作成します。さらにその中に`PendingEventsPublisher.ts`ファイルを作成し、以下のように実装します。

```typescript:CatalogService/src/Application/EventStore/PendingEventsPublisher.ts
import { inject, injectable } from 'tsyringe';

import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

import { IDomainEventPublisher } from '../../shared/DomainEvent/IDomainEventPublisher';

@injectable()
export class PendingEventsPublisher {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL_MS = 5000;

  constructor(
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("IDomainEventPublisher")
    private domainEventPublisher: IDomainEventPublisher
  ) {}

  /**
   * 定期実行を開始
   */
  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.publishPendingEvents();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * 定期実行を停止
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 未発行イベントを発行
   */
  private async publishPendingEvents(): Promise<void> {
    const pendingEvents = await this.eventStoreRepository.findPendingEvents();

    for (const event of pendingEvents) {
      try {
        this.domainEventPublisher.publish(event);

        event.publish();
        await this.eventStoreRepository.markAsPublished(event);
      } catch {
        // 発行に失敗した場合 (ネットワークエラー、ブローカーダウン等)ループを即座に中断し、後続のイベントを処理しない。
        // これにより、イベントの順序性が保証される。
        // 次のインターバルで、この失敗したイベントから再試行される。
        break;
      }
    }
  }
}
```

### 4.2 サービスの起動

実装した`PendingEventsPublishService`をアプリケーション起動時に開始するように設定します。`src/Presentation/Express/index.ts`ファイルを以下のように修正します。

```typescript:CatalogService/src/Presentation/Express/index.ts
import {
    PendingEventsPublisher
} from 'Application/EventStore/PendingEventsPublisher/PendingEventsPublisher';
// 既存のコード...

app.listen(port, () => {
  console.log(`CatalogService listening on port ${port}`);
  // サブスクライバーを登録
  container.resolve(CatalogServiceEventHandler).register();

  // 未発行イベントのパブリッシュを開始
  container.resolve(PendingEventsPublisher).start();
});
```

> [!NOTE] > **ポーリング間隔の調整について**
> ポーリング間隔（今回は 5 秒）は、システムの要件に応じて調整してください。
>
> - 間隔を短くする：イベントの即時性が向上する反面、データベースの負荷が増加
> - 間隔を長くする：データベースの負荷は減少するが、イベントの遅延が大きくなる

## 5. 動作確認

それでは、書籍登録 API を叩いてイベントが正しく保存され、ポーリングによってパブリッシュされることを確認しましょう。

### 5.1 サーバの起動

まずは、サーバを再起動します。

```bash:CatalogService/
$ npx ts-node src/Presentation/Express/index.ts
```

### 5.2 レビュー追加 API の実行

次に`curl`コマンドを利用してリクエストを送信します。

```bash:CatalogService/
$ curl -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"佐藤花子\",\"rating\":4,\"comment\":\"内容が深くて勉強になりました\"}" \
  http://localhost:3000/book/9784814400737/review
```

※ もし「書籍が存在しません」というエラーが表示された場合は、先に書籍登録 API で該当の書籍を登録してください。

### 5.3 ログの確認

サーバのログを確認すると、これまでと同じようにイベントが保存されていることが確認できます。

```bash:CatalogService/
新しいレビューが作成されました。レビューID: [ランダムID], 書籍ID: 9784814400737
```

また、5 秒後にポーリングが実行され、イベントがパブリッシュされることも確認できます。

## まとめ

以上で Outbox パターンの実装は完了です。この実装により、以下のような利点が得られました。

1. **トランザクションの一貫性**

   - ビジネスデータとイベントの保存が同一トランザクションで完結
   - どちらか一方だけが成功するという状況を排除

2. **障害に対する耐性**

   - システムが一時的に利用できなくてもイベントを失わない
   - システム復旧後に自動的にイベントが配信される

3. **イベントの順序保証**

   - データベースに保存される際の順序が保持される
   - 順序に依存する処理も正しく実行可能

本実装を基盤として、本番環境では DynamoDB Streams のようなマネージドサービスを活用することで、さらに高い信頼性とスケーラビリティを実現できます。
