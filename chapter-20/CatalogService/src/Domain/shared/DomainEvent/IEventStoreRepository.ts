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
