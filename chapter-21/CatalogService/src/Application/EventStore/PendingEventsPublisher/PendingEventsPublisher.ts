import { inject, injectable } from "tsyringe";

import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

import { IDomainEventPublisher } from "../../shared/DomainEvent/IDomainEventPublisher";

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
