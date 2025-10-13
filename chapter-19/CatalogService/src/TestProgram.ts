import { container } from "tsyringe";

import { MockDomainEventPublisher } from "Application/shared/DomainEvent/MockDomainEventPublisher";
import { MockTransactionManager } from "Application/shared/MockTransactionManager";
import { InMemoryBookRepository } from "Infrastructure/InMemory/Book/InMemoryBookRepository";
import { InMemoryReviewRepository } from "Infrastructure/InMemory/Review/InMemoryReviewRepository";

// DomainEvent
container.register("IDomainEventPublisher", {
  useClass: MockDomainEventPublisher,
});

// Repository registrations
container.register("IBookRepository", {
  useClass: InMemoryBookRepository,
});

container.register("IReviewRepository", {
  useClass: InMemoryReviewRepository,
});

// TransactionManager registration
container.register("ITransactionManager", {
  useClass: MockTransactionManager,
});
