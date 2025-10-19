import { IDomainEventSubscriber } from "Application/shared/DomainEvent/IDomainEventSubscriber";

import { eventEmitterClient } from "./EventEmitterClient";

export class EventEmitterDomainEventSubscriber
  implements IDomainEventSubscriber
{
  subscribe(topic: string, callback: (event: Record<string, any>) => void) {
    eventEmitterClient.on(topic, callback);
  }
}
