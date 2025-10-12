import { container } from "tsyringe";

import { SQLBookRepository } from "Infrastructure/SQL/Book/SQLBookRepository";
import { SQLReviewRepository } from "Infrastructure/SQL/Review/SQLReviewRepository";
import { SQLTransactionManager } from "Infrastructure/SQL/SQLTransactionManager";

// repository
container.register("IBookRepository", {
  useClass: SQLBookRepository,
});

container.register("IReviewRepository", {
  useClass: SQLReviewRepository,
});

// transactionManager
container.register("ITransactionManager", {
  useClass: SQLTransactionManager,
});
