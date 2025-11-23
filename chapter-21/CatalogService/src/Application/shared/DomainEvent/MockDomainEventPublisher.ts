import { DomainEvent } from "Domain/shared/DomainEvent/DomainEvent";

import { IDomainEventPublisher } from "./IDomainEventPublisher";

export class MockDomainEventPublisher implements IDomainEventPublisher {
  private publishedEvents: DomainEvent[] = [];

  publish(domainEvent: DomainEvent): void {
    this.publishedEvents.push(domainEvent);
  }
}
