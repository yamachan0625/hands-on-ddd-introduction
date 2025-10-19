export interface IDomainEventSubscriber {
  subscribe(
    topic: string,
    callback: (event: Record<string, any>) => void
  ): void;
}
