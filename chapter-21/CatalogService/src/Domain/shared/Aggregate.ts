import { DomainEvent } from "./DomainEvent/DomainEvent";

export abstract class Aggregate<Event extends DomainEvent> {
  domainEvents: Event[] = [];

  protected addDomainEvent(domainEvent: Event) {
    this.domainEvents.push(domainEvent);
  }

  getDomainEvents(): Event[] {
    return this.domainEvents;
  }

  clearDomainEvents() {
    this.domainEvents = [];
  }
}
