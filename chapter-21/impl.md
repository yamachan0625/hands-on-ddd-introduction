# イベントソーシング - 実装編

本ページでは、書籍「第 21 章 イベントソーシングという選択肢」で説明した設計を、実際のコードで実装していきます。イベントソーシングの概念や設計については書籍を参照してください。

## 実装の流れ

実装は以下の順序で進めていきます。

1. Review 集約のイベントソーシングへの移行
2. Review 集約のテスト修正
3. イベントストアリポジトリの修正
4. Review アプリケーションサービスの修正
5. 動作確認

## 1. Review 集約のイベントソーシングへの移行

イベントソーシングでは、集約の現在の状態をデータベースに直接保存する代わりに、発生したすべてのイベントをデータベースに時系列で記録します。そして、必要なときにそれらのイベントを順番に適用することで集約の現在の状態を再構築します。このアプローチに従い、`Review`集約をイベントベースの設計に変更し、過去のイベント履歴から正確な状態を再現できるように実装します。

### 1.1 修正後のコード全体

以下が、イベントソーシングに対応した`Review`集約の完全なコードです。

```ts:CatalogService/src/Domain/models/Review/Review.ts
import { Aggregate } from "../../shared/Aggregate";
import {
  ReviewDomainEvent,
  ReviewEventFactory,
} from "../../shared/DomainEvent/Review/ReviewDomainEventFactory";
import { BookId } from "../Book/BookId/BookId";
import { Comment } from "./Comment/Comment";
import { Name } from "./Name/Name";
import { Rating } from "./Rating/Rating";
import { ReviewId } from "./ReviewId/ReviewId";
import { ReviewIdentity } from "./ReviewIdentity/ReviewIdentity";

export class Review extends Aggregate<ReviewDomainEvent> {
  private constructor(
    private _identity: ReviewIdentity,
    private _bookId: BookId,
    private _name: Name,
    private _rating: Rating,
    private _comment?: Comment
  ) {
    super();
  }

  private static initialize(): Review {
    return new Review(undefined!, undefined!, undefined!, undefined!);
  }

  private applyEvent(event: ReviewDomainEvent): void {
    switch (event.eventType) {
      case "ReviewCreated": {
        const { reviewId, bookId, name, rating, comment } = event.eventBody;
        this._identity = new ReviewIdentity(new ReviewId(reviewId));
        this._bookId = new BookId(bookId);
        this._name = new Name(name);
        this._rating = new Rating(rating);
        this._comment = comment ? new Comment(comment) : undefined;
        break;
      }

      case "ReviewNameUpdated": {
        this._name = new Name(event.eventBody.name);
        break;
      }

      case "ReviewRatingUpdated": {
        this._rating = new Rating(event.eventBody.rating);
        break;
      }

      case "ReviewCommentEdited": {
        if (event.eventBody.comment) {
          this._comment = new Comment(event.eventBody.comment);
        }
        break;
      }

      case "ReviewDeleted": {
        break;
      }
    }
  }

  static create(
    identity: ReviewIdentity,
    bookId: BookId,
    name: Name,
    rating: Rating,
    comment?: Comment
  ): Review {
    const review = Review.initialize();
    const event = ReviewEventFactory.createReviewCreated(
      identity.reviewId,
      bookId,
      name,
      rating,
      comment
    );
    review.addDomainEvent(event);
    review.applyEvent(event);
    return review;
  }

  static reconstruct(events: ReviewDomainEvent[]): Review {
    if (events.length === 0) {
      throw new Error("イベントが空です");
    }

    const review = Review.initialize();
    for (const event of events) {
      review.applyEvent(event);
    }

    return review;
  }

  /**
   * このレビューが信頼できるかを判断
   * @param threshold 信頼性閾値（0.0〜1.0）
   * @returns 信頼できる場合はtrue
   */
  isTrustworthy(threshold: number = 0.6): boolean {
    // コメントがない場合は評価のみで判断
    if (!this._comment) {
      return this._rating.getQualityFactor() >= threshold;
    }

    // 評価とコメントの係数を組み合わせる
    const ratingFactor = this._rating.getQualityFactor();
    const commentFactor = this._comment.getQualityFactor();

    // 評価の重みを0.7、コメントの重みを0.3とする
    const combinedFactor = ratingFactor * 0.7 + commentFactor * 0.3;

    return combinedFactor >= threshold;
  }

  /**
   * コメントから推薦本を抽出する
   * @returns 推薦本のタイトル配列
   */
  extractRecommendedBooks(): string[] {
    if (!this._comment) return [];

    // 書籍名の後30文字以内に推薦キーワードがあるものを抽出
    const pattern =
      /[『「]([^』」]+)[』」][^。]{0,30}(?:読む|読んだ|学ぶ|学んだ|必要|推奨|おすすめ|良い|いい|理解)/g;

    const matches = this._comment.extractMatches(pattern);
    return Array.from(new Set(matches));
  }

  /**
   * 別のレビューと同一かどうかを判定
   * @param other 比較対象のレビュー
   * @returns 同一の場合はtrue
   */
  equals(other: Review): boolean {
    return this._identity.equals(other._identity);
  }

  get reviewId() {
    return this._identity.reviewId;
  }

  get bookId(): BookId {
    return this._bookId;
  }

  get name(): Name {
    return this._name;
  }

  get rating(): Rating {
    return this._rating;
  }

  get comment(): Comment | undefined {
    return this._comment;
  }

  updateName(name: Name): void {
    const event = ReviewEventFactory.createReviewNameUpdated(
      this.reviewId,
      name
    );
    this.addDomainEvent(event);
    this.applyEvent(event);
  }

  updateRating(rating: Rating): void {
    const event = ReviewEventFactory.createReviewRatingUpdated(
      this.reviewId,
      rating
    );
    this.addDomainEvent(event);
    this.applyEvent(event);
  }

  editComment(comment: Comment): void {
    const event = ReviewEventFactory.createReviewCommentEdited(
      this.reviewId,
      comment
    );
    this.addDomainEvent(event);
    this.applyEvent(event);
  }

  delete(): void {
    const event = ReviewEventFactory.createReviewDeleted(this.reviewId);
    this.addDomainEvent(event);
  }
}
```

### 1.2 主要な変更点の解説

#### コンストラクターと initialize メソッド

```ts
private constructor(
  private _identity: ReviewIdentity,
  private _bookId: BookId,
  private _name: Name,
  private _rating: Rating,
  private _comment?: Comment
) {
  super();
}

private static initialize(): Review {
  return new Review(undefined!, undefined!, undefined!, undefined!);
}
```

イベントソーシングパターンへの移行に伴い、状態の初期化をイベントの適用によって行う必要があります。そのため、プロパティ定義をコンストラクタパラメータから分離し、`readonly`修飾子を削除しました。`initialize`メソッドは、未初期化の状態でインスタンスを生成し、後からイベントを適用して状態を構築できるようにします。

#### applyEvent メソッド

```ts
private applyEvent(event: ReviewDomainEvent): void {
  switch (event.eventType) {
    case "ReviewCreated": {
      const { reviewId, bookId, name, rating, comment } = event.eventBody;
      this._identity = new ReviewIdentity(new ReviewId(reviewId));
      this._bookId = new BookId(bookId);
      this._name = new Name(name);
      this._rating = new Rating(rating);
      this._comment = comment ? new Comment(comment) : undefined;
      break;
    }
    // その他のイベントタイプ...
  }
}
```

`applyEvent`メソッドは、イベントソーシングの中核となるメソッドです。イベントの種類に応じて集約の状態を更新します。このメソッドは、新しいイベントが発生したときと、過去のイベントから状態を再構築するときの両方で使用されます。各イベントタイプに対して、対応する状態変更のロジックを実装しています。

#### create メソッドでのイベント適用

```ts
static create(
  identity: ReviewIdentity,
  bookId: BookId,
  name: Name,
  rating: Rating,
  comment?: Comment
): Review {
  const review = Review.initialize();
  const event = ReviewEventFactory.createReviewCreated(
    identity.reviewId,
    bookId,
    name,
    rating,
    comment
  );

  review.applyEvent(event);
  review.addDomainEvent(event);
  return review;
}
```

従来は`new Review(...)`で直接状態を初期化していましたが、イベントソーシングでは以下の手順を踏みます。

1. `initialize()`で空のインスタンスを生成
2. イベントを作成
3. `applyEvent()`でイベントを適用して状態を構築
4. `addDomainEvent()`でイベントを蓄積

この変更により、状態変更がすべてイベントを通じて行われることが保証されます。

#### 状態変更メソッドでのイベント適用

```ts
updateName(name: Name): void {
  const event = ReviewEventFactory.createReviewNameUpdated(
    this._identity.reviewId,
    name
  );
  this.applyEvent(event);
  this.addDomainEvent(event);
}
```

従来は`this._name = name`のように直接プロパティを変更していましたが、イベントソーシングでは、

1. イベントを作成
2. `applyEvent()`でイベントを適用（これが実際の状態変更を行う）
3. `addDomainEvent()`でイベントを蓄積

この変更により、すべての状態変更がイベントとして記録されます。`updateRating`、`editComment`、`delete`メソッドも同様のパターンに従います。

#### reconstruct メソッドでのイベントからの再構築

```ts
static reconstruct(events: ReviewDomainEvent[]): Review {
  if (events.length === 0) {
    throw new Error("イベントが空です");
  }

  const review = Review.initialize();
  for (const event of events) {
    review.applyEvent(event);
  }

  return review;
}
```

従来の`reconstruct`メソッドは、すべてのプロパティを引数として受け取り、インスタンスを直接構築していました。イベントソーシング版では、イベントの配列を受け取り、それらを順番に適用することで状態を再構築します。

このメソッドにより、データベースに保存されたイベント履歴から、任意の時点の集約の状態を復元できるようになります。

これらの変更により、`Review`集約の状態変更がすべてイベントによって記録され、イベント履歴から状態を完全に再構築できるようになりました。

## 2. Review 集約のテスト修正

イベントソーシングへの移行に伴い、`Review.test.ts`のテストも修正する必要があります。特に`reconstruct`メソッドのシグネチャが変更されたため、対応するテストを追加しておきます。

### 2.1 修正後のテストコード

以下が、イベントソーシングに対応した`Review.test.ts`の主要な部分です。

```ts:CatalogService/src/Domain/models/Review/Review.test.ts
import { ReviewEventFactory } from "../../shared/DomainEvent/Review/ReviewDomainEventFactory";
import { BookId } from "../Book/BookId/BookId";
import { Comment } from "./Comment/Comment";
import { Name } from "./Name/Name";
import { Rating } from "./Rating/Rating";
import { Review } from "./Review";
import { ReviewId } from "./ReviewId/ReviewId";
import { ReviewIdentity } from "./ReviewIdentity/ReviewIdentity";

describe("Review", () => {
  const reviewId = new ReviewId();
  const reviewIdentity = new ReviewIdentity(reviewId);
  const bookId = new BookId("9784814400737");
  const name = new Name("山田太郎");
  const rating = new Rating(4);
  const comment = new Comment(
    "とても面白かったです。『実践ドメイン駆動設計』を読んだ後にこの本を読むと理解しやすいです。"
  );

  describe("create", () => {
    it("レビューを正しく作成できる", () => {
      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );

      expect(review.reviewId.equals(reviewId)).toBeTruthy();
      expect(review.bookId.equals(bookId)).toBeTruthy();
      expect(review.name.equals(name)).toBeTruthy();
      expect(review.rating.equals(rating)).toBeTruthy();
      expect(review.comment?.equals(comment)).toBeTruthy();
    });
  });

  describe("reconstruct", () => {
    it("複数のイベントからレビューを再構築できる", () => {
      const newName = new Name("佐藤花子");
      const newRating = new Rating(5);
      const newComment = new Comment("更新されたコメントです。");

      const events = [
        ReviewEventFactory.createReviewCreated(
          reviewId,
          bookId,
          name,
          rating,
          comment
        ),
        ReviewEventFactory.createReviewNameUpdated(reviewId, newName),
        ReviewEventFactory.createReviewRatingUpdated(reviewId, newRating),
        ReviewEventFactory.createReviewCommentEdited(reviewId, newComment),
      ];

      const review = Review.reconstruct(events);

      expect(review.reviewId.equals(reviewId)).toBeTruthy();
      expect(review.bookId.equals(bookId)).toBeTruthy();
      expect(review.name.equals(newName)).toBeTruthy();
      expect(review.rating.equals(newRating)).toBeTruthy();
      expect(review.comment?.equals(newComment)).toBeTruthy();
    });

    it("再構築時にドメインイベントリストは空である", () => {
      const events = [
        ReviewEventFactory.createReviewCreated(
          reviewId,
          bookId,
          name,
          rating,
          comment
        ),
      ];

      const review = Review.reconstruct(events);

      // 再構築時は過去のイベントを適用するだけで、ドメインイベントリストには追加しない
      // （これらのイベントは既に永続化済みのため）
      expect(review.getDomainEvents()).toHaveLength(0);
    });

    it("空のイベント配列でエラーをスローする", () => {
      expect(() => Review.reconstruct([])).toThrow("イベントが空です");
    });

    it("イベントの順序通りに状態が変更される", () => {
      const name1 = new Name("山田太郎");
      const name2 = new Name("佐藤花子");
      const name3 = new Name("鈴木次郎");

      const events = [
        ReviewEventFactory.createReviewCreated(
          reviewId,
          bookId,
          name1,
          rating,
          comment
        ),
        ReviewEventFactory.createReviewNameUpdated(reviewId, name2),
        ReviewEventFactory.createReviewNameUpdated(reviewId, name3),
      ];

      const review = Review.reconstruct(events);

      // 最後のイベントで設定された名前が反映される
      expect(review.name.equals(name3)).toBeTruthy();
    });
  });

  // その他のテスト（equals, isTrustworthy, extractRecommendedBooks等）は省略
});
```

### 2.2 主要な変更点の解説

#### reconstruct テストの追加

従来の`reconstruct`メソッドは、すべてのプロパティを引数として受け取るシグネチャでしたが、イベントソーシング版では、イベントの配列を受け取るように変更されました。そのため、テストも大幅に変更する必要があります。

**従来の reconstruct（イベントソーシング前）**

```ts
// 旧バージョン
it("レビューを正しく再構築できる", () => {
  const review = Review.reconstruct(
    reviewIdentity,
    bookId,
    name,
    rating,
    comment
  );

  expect(review.reviewId.equals(reviewId)).toBeTruthy();
  // ... 検証
});
```

このテストは、単にコンストラクタと同等の機能をテストしているだけでした。

**イベントソーシング版の reconstruct:**

```ts
it("複数のイベントからレビューを再構築できる", () => {
  const newName = new Name("佐藤花子");
  const newRating = new Rating(5);
  const newComment = new Comment("更新されたコメントです。");

  const events = [
    ReviewEventFactory.createReviewCreated(
      reviewId,
      bookId,
      name,
      rating,
      comment
    ),
    ReviewEventFactory.createReviewNameUpdated(reviewId, newName),
    ReviewEventFactory.createReviewRatingUpdated(reviewId, newRating),
    ReviewEventFactory.createReviewCommentEdited(reviewId, newComment),
  ];

  const review = Review.reconstruct(events);

  // 最終的な状態が正しいことを検証
  expect(review.name.equals(newName)).toBeTruthy();
  expect(review.rating.equals(newRating)).toBeTruthy();
  expect(review.comment?.equals(newComment)).toBeTruthy();
});
```

このテストは、複数のイベントを順次適用して状態を構築できることを検証しています。イベントソーシングの本質である「イベント履歴からの状態再構築」を直接テストしています。

#### 再構築時のドメインイベントリストのテスト

```ts
it("再構築時にドメインイベントリストは空である", () => {
  const events = [
    ReviewEventFactory.createReviewCreated(
      reviewId,
      bookId,
      name,
      rating,
      comment
    ),
  ];

  const review = Review.reconstruct(events);

  // 再構築時は過去のイベントを適用するだけで、ドメインイベントリストには追加しない
  expect(review.getDomainEvents()).toHaveLength(0);
});
```

このテストは重要な仕様を検証しています。`reconstruct`メソッドは、過去のイベントから状態を復元するだけで、新しいドメインイベントを生成しません。これにより、既に永続化済みのイベントが重複して記録されることを防ぎます。

#### エラーケースのテスト

```ts
it("空のイベント配列でエラーをスローする", () => {
  expect(() => Review.reconstruct([])).toThrow("イベントが空です");
});
```

イベントが存在しない場合の異常系をテストしています。集約はイベント履歴なしでは再構築できないため、適切なエラーメッセージでエラーをスローします。

#### イベント順序の検証

```ts
it("イベントの順序通りに状態が変更される", () => {
  const name1 = new Name("山田太郎");
  const name2 = new Name("佐藤花子");
  const name3 = new Name("鈴木次郎");

  const events = [
    ReviewEventFactory.createReviewCreated(
      reviewId,
      bookId,
      name1,
      rating,
      comment
    ),
    ReviewEventFactory.createReviewNameUpdated(reviewId, name2),
    ReviewEventFactory.createReviewNameUpdated(reviewId, name3),
  ];

  const review = Review.reconstruct(events);

  // 最後のイベントで設定された名前が反映される
  expect(review.name.equals(name3)).toBeTruthy();
});
```

このテストは、イベントが順序通りに適用されることを検証しています。イベントソーシングでは、イベントの順序が状態に直接影響するため、この振る舞いを保証することが重要です。

これらの変更により、イベントソーシングの核心的な機能である「イベントからの状態再構築」が適切にテストされるようになりました。

## 3. イベントストアリポジトリの修正

次に、`EventStoreRepository`に`find`メソッドを追加します。このメソッドは、指定された集約 ID とタイプに関連するすべてのイベントを時系列順で取得し、`reconstruct`関数を使用して集約を再構築します。

### 3.1 インターフェイスの修正

まずは、インターフェイスに`find`メソッドを追加します。

```ts:CatalogService/src/Domain/shared/DomainEvent/IEventStoreRepository.ts
import { Aggregate } from "../Aggregate";
import { DomainEvent } from "./DomainEvent";

export interface IEventStoreRepository {
  // 集約の再構築
  find<T extends Aggregate<DomainEvent>>(
    aggregateId: string,
    aggregateType: string,
    reconstruct: (events: T["domainEvents"]) => T
  ): Promise<T | null>;
  // 未発行のイベントを取得
  findPendingEvents(): Promise<DomainEvent[]>;
  // 集約からイベントを保存
  store(aggregate: Aggregate<DomainEvent>): Promise<void>;
  // イベントを発行済みとしてマーク
  markAsPublished(event: DomainEvent): Promise<void>;
}
```

### 3.2 SQL 実装の修正

次に、`SQLEventStoreRepository`に`find`メソッドを追加します。

```ts:CatalogService/src/Infrastructure/SQL/EventStore/SQLEventStoreRepository.ts
import { injectable } from "tsyringe";

import { Aggregate } from "Domain/shared/Aggregate";
import { DomainEvent } from "Domain/shared/DomainEvent/DomainEvent";
import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

import { SQLClientManager } from "../SQLClientManager";

@injectable()
export class SQLEventStoreRepository implements IEventStoreRepository {
  constructor(private clientManager: SQLClientManager) {}

  async find<T extends Aggregate<DomainEvent>>(
    aggregateId: string,
    aggregateType: string,
    reconstruct: (events: T["domainEvents"]) => T
  ): Promise<T | null> {
    return await this.clientManager.withClient(async (client) => {
      // 指定された集約に関連する全てのイベントを時系列順で取得
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
        WHERE "aggregateId" = $1 AND "aggregateType" = $2
        ORDER BY "occurredOn" ASC
      `;

      const result = await client.query(query, [aggregateId, aggregateType]);

      if (result.rows.length === 0) {
        return null;
      }

      const domainEvents = result.rows.map((row) =>
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

      // 集約の再構築関数を使用して集約を再構築
      return reconstruct(domainEvents);
    });
  }

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

### 3.3 InMemory 実装の修正

次に、テスト環境や開発環境で利用する `InMemoryEventStoreRepository` にも同様に `find` メソッドを追加しておきます。

```ts:CatalogService/src/Infrastructure/InMemory/EventStore/InMemoryEventStoreRepository.ts
import { Aggregate } from "Domain/shared/Aggregate";
import { DomainEvent } from "Domain/shared/DomainEvent/DomainEvent";
import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

export class InMemoryEventStoreRepository implements IEventStoreRepository {
  private events: DomainEvent[] = [];

  async find<T extends Aggregate<DomainEvent>>(
    aggregateId: string,
    aggregateType: string,
    reconstruct: (events: T["domainEvents"]) => T
  ): Promise<T | null> {
    // 指定された集約IDと集約タイプに一致するイベントをフィルタリング
    const filteredEvents = this.events.filter(
      (event) =>
        event.aggregateId === aggregateId &&
        event.aggregateType === aggregateType
    );

    if (filteredEvents.length === 0) {
      return null;
    }

    // イベントを発生日時でソート（時系列順）
    const sortedEvents = filteredEvents.sort(
      (a, b) => a.occurredOn.getTime() - b.occurredOn.getTime()
    );

    // 集約の再構築関数を使用して集約を再構築
    return reconstruct(sortedEvents as T["domainEvents"]);
  }

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

## 4. Review アプリケーションサービスの修正

次に、アプリケーションサービスを修正します。従来は集約の状態を直接データベースに保存していましたが、イベントソーシングパターンでは、イベントストアのみを使用して集約の状態変更を管理します。また、集約の取得も`eventStoreRepository.find()`を使ってイベント履歴から再構築するように変更します。

### 4.1 AddReviewService の修正

```diff ts:CatalogService/src/Application/Review/AddReviewService/AddReviewService.ts
+ import { Review } from "Domain/models/Review/Review";
- import { IReviewRepository } from "Domain/models/Review/IReviewRepository";
  (省略)

  @injectable()
  export class AddReviewService {
    constructor(
-     @inject("IReviewRepository")
-     private reviewRepository: IReviewRepository,
      @inject("IBookRepository")
      private bookRepository: IBookRepository,
      @inject("IEventStoreRepository")
      private eventStoreRepository: IEventStoreRepository,
      @inject("ITransactionManager")
      private transactionManager: ITransactionManager
    ) {}

    async execute(command: AddReviewCommand): Promise<AddReviewDTO> {
      (省略)

      return await this.transactionManager.begin(async () => {
        (省略)

-       await this.reviewRepository.save(review);
        await this.eventStoreRepository.store(review);

        return {
          id: review.reviewId.value,
          bookId: review.bookId.value,
          name: review.name.value,
          rating: review.rating.value,
          comment: review.comment?.value,
        };
      });
    }
  }
```

### 4.2 EditReviewService の修正

```ts:CatalogService/src/Application/Review/EditReviewService/EditReviewService.ts
import { inject, injectable } from "tsyringe";

import { ITransactionManager } from "Application/shared/ITransactionManager";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

import { EditReviewDTO } from "./EditReviewDTO";

export type EditReviewCommand = {
  reviewId: string;
  name?: string;
  rating?: number;
  comment?: string;
};

@injectable()
export class EditReviewService {
  constructor(
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: EditReviewCommand): Promise<EditReviewDTO> {
    const review = await this.transactionManager.begin(async () => {
      // 対象のレビューを取得
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.eventStoreRepository.find(
        reviewId.value,
        "Review",
        Review.reconstruct
      );

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

### 4.3 DeleteReviewService の修正

```ts:CatalogService/src/Application/Review/DeleteReviewService/DeleteReviewService.ts
import { inject, injectable } from "tsyringe";

import { ITransactionManager } from "Application/shared/ITransactionManager";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

export type DeleteReviewCommand = {
  reviewId: string;
};

@injectable()
export class DeleteReviewService {
  constructor(
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: DeleteReviewCommand): Promise<void> {
    await this.transactionManager.begin(async () => {
      // 対象のレビューを取得して存在確認
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.eventStoreRepository.find(
        reviewId.value,
        "Review",
        Review.reconstruct
      );

      if (!review) {
        throw new Error("レビューが存在しません");
      }

      review.delete();

      await this.eventStoreRepository.store(review);

      return review;
    });
  }
}
```

## 5. アプリケーションサービステストでのイベントソーシング検証

イベントソーシングの導入により、アプリケーションサービスのテストも修正が必要です。従来のリポジトリベースのテストから、イベントストアベースのテストに変更し、イベントの記録と集約の再構築を検証できるように修正していきます。

### 5.1 イベントソーシングのテストで確認すべき項目

アプリケーションサービスのテストでは、以下の要素を確認することで、イベントソーシングが正しく動作していることを検証できます。

1. **操作に対応するイベントが正しい順序で記録されていること**
2. **記録されたイベントから集約の最終状態が正しく復元できること**

これらの確認項目により、イベントソーシングの核心的な機能である「操作履歴の正確な記録」と「イベントからの状態復元」が適切に機能していることを保証できます。

### 5.2 AddReviewService のテスト修正

```ts:CatalogService/src/Application/Review/AddReviewService/AddReviewService.test.ts
import { container } from "tsyringe";

import { Author } from "Domain/models/Book/Author/Author";
import { Book } from "Domain/models/Book/Book";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { BookIdentity } from "Domain/models/Book/BookIdentity/BookIdentity";
import { Price } from "Domain/models/Book/Price/Price";
import { Title } from "Domain/models/Book/Title/Title";
import { Review } from "Domain/models/Review/Review";
import { ReviewDomainEvent } from "Domain/shared/DomainEvent/Review/ReviewDomainEventFactory";
import { InMemoryBookRepository } from "Infrastructure/InMemory/Book/InMemoryBookRepository";
import { InMemoryEventStoreRepository } from "Infrastructure/InMemory/InMemory/InMemoryEventStoreRepository";

import { AddReviewDTO } from "./AddReviewDTO";
import { AddReviewCommand, AddReviewService } from "./AddReviewService";

describe("AddReviewService", () => {
  let eventStoreRepository: InMemoryEventStoreRepository;
  let bookRepository: InMemoryBookRepository;
  let addReviewService: AddReviewService;

  beforeEach(async () => {
    addReviewService = container.resolve(AddReviewService);
    eventStoreRepository = addReviewService[
      "eventStoreRepository"
    ] as InMemoryEventStoreRepository;
    bookRepository = addReviewService[
      "bookRepository"
    ] as InMemoryBookRepository;
  });

  it("存在する書籍に対してレビューを追加することができる", async () => {
    const bookId = "9784798126708";
    const book = Book.create(
      new BookIdentity(
        new BookId(bookId),
        new Title("テスト書籍"),
        new Author("テスト著者")
      ),
      new Price({
        amount: 1500,
        currency: "JPY",
      })
    );

    await bookRepository.save(book);

    const command: Required<AddReviewCommand> = {
      bookId,
      name: "レビュアー1",
      rating: 5,
      comment: "とても良い本でした",
    };

    const result = await addReviewService.execute(command);

    // DTOの内容を検証
    expect(result).toEqual<AddReviewDTO>({
      id: expect.any(String), // IDは自動生成されるため、具体的な値は期待しない
      bookId: bookId,
      name: command.name,
      rating: command.rating,
      comment: command.comment,
    });

    // レビューが正しく保存されたか確認
    const savedReview = await eventStoreRepository.find(
      result.id,
      "Review",
      (events) => {
        const eventTypes = events.map((event) => event.eventType);
        // 操作に対応するイベントが記録されていることを確認
        expect(eventTypes).toStrictEqual(["ReviewCreated"]);
        return Review.reconstruct(events as ReviewDomainEvent[]);
      }
    );
    expect(savedReview).not.toBeNull();
  });

  it("書籍が存在しない場合エラーを投げる", async () => {
    const command: Required<AddReviewCommand> = {
      bookId: "9784798126708", // 未登録の書籍ID
      name: "レビュアー1",
      rating: 5,
      comment: "とても良い本でした",
    };

    await expect(addReviewService.execute(command)).rejects.toThrow(
      "書籍が存在しません"
    );
  });
});

```

### 5.3 EditReviewService のテスト修正

```ts:CatalogService/src/Application/Review/EditReviewService/EditReviewService.test.ts
import { container } from "tsyringe";

import { BookId } from "Domain/models/Book/BookId/BookId";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";
import { ReviewDomainEvent } from "Domain/shared/DomainEvent/Review/ReviewDomainEventFactory";
import { InMemoryEventStoreRepository } from "Infrastructure/InMemory/InMemory/InMemoryEventStoreRepository";

import { EditReviewCommand, EditReviewService } from "./EditReviewService";

describe("EditReviewService", () => {
  let eventStoreRepository: InMemoryEventStoreRepository;
  let editReviewService: EditReviewService;

  beforeEach(async () => {
    editReviewService = container.resolve(EditReviewService);
    eventStoreRepository = editReviewService[
      "eventStoreRepository"
    ] as InMemoryEventStoreRepository;
  });

  it("存在するレビューを編集することができる", async () => {
    const reviewId = "test-review-id";
    const bookId = "9784798126708";

    const review = Review.create(
      new ReviewIdentity(new ReviewId(reviewId)),
      new BookId(bookId),
      new Name("元の名前"),
      new Rating(3),
      new Comment("元のコメント")
    );

    await eventStoreRepository.store(review);

    const command: EditReviewCommand = {
      reviewId,
      name: "新しい名前",
      rating: 5,
      comment: "新しいコメント",
    };

    await editReviewService.execute(command);

    // ドメインイベントが正しい順序で記録されていることを確認
    await eventStoreRepository.find(
      review.reviewId.value,
      "Review",
      (events) => {
        const eventTypes = events.map((event) => event.eventType);
        // 各更新操作に対応するイベントが記録されていることを確認
        expect(eventTypes).toStrictEqual([
          "ReviewCreated",
          "ReviewNameUpdated",
          "ReviewRatingUpdated",
          "ReviewCommentEdited",
        ]);

        return Review.reconstruct(events as ReviewDomainEvent[]);
      }
    );

    // 変更が反映されたか確認
    const updatedReview = await eventStoreRepository.find(
      review.reviewId.value,
      "Review",
      Review.reconstruct
    );
    expect(updatedReview).not.toBeNull();
    expect(updatedReview?.name.value).toBe("新しい名前");
    expect(updatedReview?.rating.value).toBe(5);
    expect(updatedReview?.comment?.value).toBe("新しいコメント");
  });

  it("レビューが存在しない場合エラーを投げる", async () => {
    const command: EditReviewCommand = {
      reviewId: "non-existent-review",
      name: "新しい名前",
    };

    await expect(editReviewService.execute(command)).rejects.toThrow(
      "レビューが存在しません"
    );
  });
});
```

### 5.4 DeleteReviewService のテスト修正

```ts:CatalogService/src/Application/Review/DeleteReviewService/DeleteReviewService.test.ts
import { container } from "tsyringe";

import { BookId } from "Domain/models/Book/BookId/BookId";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";
import { ReviewDomainEvent } from "Domain/shared/DomainEvent/Review/ReviewDomainEventFactory";
import { InMemoryEventStoreRepository } from "Infrastructure/InMemory/InMemory/InMemoryEventStoreRepository";

import {
  DeleteReviewCommand,
  DeleteReviewService,
} from "./DeleteReviewService";

describe("DeleteReviewService", () => {
  let eventStoreRepository: InMemoryEventStoreRepository;
  let deleteReviewService: DeleteReviewService;

  beforeEach(async () => {
    deleteReviewService = container.resolve(DeleteReviewService);
    eventStoreRepository = deleteReviewService[
      "eventStoreRepository"
    ] as InMemoryEventStoreRepository;
  });

  it("存在するレビューを削除することができる", async () => {
    const reviewId = "test-review-id";
    const bookId = "9784798126708";

    const review = Review.create(
      new ReviewIdentity(new ReviewId(reviewId)),
      new BookId(bookId),
      new Name("レビュアー名"),
      new Rating(4),
      new Comment("テストコメント")
    );

    await eventStoreRepository.store(review);

    // 作成されたことを確認
    const retrievedReview = await eventStoreRepository.find(
      review.reviewId.value,
      "Review",
      Review.reconstruct
    );
    expect(retrievedReview).not.toBeNull();

    // 削除を実行
    const command: DeleteReviewCommand = { reviewId };
    await deleteReviewService.execute(command);

    // ReviewDeletedイベントが記録されていることを確認
    await eventStoreRepository.find(
      review.reviewId.value,
      "Review",
      (events) => {
        const eventTypes = events.map((event) => event.eventType);
        // 各操作に対応するイベントが記録されていることを確認
        expect(eventTypes).toStrictEqual(["ReviewCreated", "ReviewDeleted"]);
        return Review.reconstruct(events as ReviewDomainEvent[]);
      }
    );
  });

  it("レビューが存在しない場合エラーを投げる", async () => {
    const command: DeleteReviewCommand = {
      reviewId: "non-existent-review",
    };

    await expect(deleteReviewService.execute(command)).rejects.toThrow(
      "レビューが存在しません"
    );
  });
});
```

従来のリポジトリベースのテストでは状態の保存・取得のみを検証していましたが、イベントソーシングベースのテストでは、システムの変更履歴とその一貫性も含めた包括的な検証が行えるようになります。

## 6. 動作確認

それでは、レビュー追加 API を叩いてイベントが正しく保存され、集約の状態が正しく再構築されることを確認しましょう。

### 6.1 サーバの起動

まずは、サーバを再起動します。

```bash:CatalogService/
$ npx ts-node src/Presentation/Express/index.ts
```

### 6.2 レビュー追加 API の実行

次に`curl`コマンドを利用してリクエストを送信します。

```bash:CatalogService/
$ curl -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"佐藤花子\",\"rating\":4,\"comment\":\"内容が深くて勉強になりました\"}" \
  http://localhost:3000/book/9784814400737/review
```

※ もし「書籍が存在しません」というエラーが表示された場合は、先に書籍登録 API で該当の書籍を登録してください。

### 6.3 ログの確認

サーバのログを確認すると、これまでと同じようにイベントが保存されていることが確認できます。

```bash:CatalogService/
新しいレビューが作成されました。レビューID: [ランダムID], 書籍ID: 9784814400737
```

### 6.4 データベースでのイベント確認

イベントソーシングでは、集約の状態変更がイベントとして記録されています。データベースの Event テーブルを確認すると、ReviewCreated イベントが保存されていることが確認できます。

```sql
SELECT * FROM "Event" ORDER BY "occurredOn" DESC LIMIT 5;
```

このクエリを実行すると、最新のイベントが時系列順で表示されます。

## まとめ

以上でイベントソーシングの実装は完了です。この実装により、以下のような利点が得られました。

1. **状態変更の完全な履歴保持**

   - レビューのすべての変更がイベントとして記録される
   - いつ、何が、どのように変わったかの履歴が永続化される

2. **データの二重管理の解消**

   - 集約の状態とイベントの二重管理を回避
   - イベントが唯一の情報源として機能

3. **イベントからの状態再構築**

   - 記録されたイベント履歴から集約の現在の状態を完全に復元
   - 任意の時点の状態を正確に再現可能

4. **新しいビジネス価値の創出可能性**
   - 蓄積されたイベントデータから多様な分析が可能
   - 後から新しい視点での価値創出が実現

本実装を基盤として、CQRS パターンとの組み合わせや、スナップショットによるパフォーマンス最適化など、さらなる発展が可能です。
