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
