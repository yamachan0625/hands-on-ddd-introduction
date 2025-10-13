import { DomainEvent } from "Domain/shared/DomainEvent/DomainEvent";

import { IDomainEventPublisher } from "./IDomainEventPublisher";

export class MockDomainEventPublisher implements IDomainEventPublisher {
  publish(domainEvent: DomainEvent) {
    return domainEvent;
  }
}
