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
