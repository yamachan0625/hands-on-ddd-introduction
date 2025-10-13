import { inject, injectable } from "tsyringe";

import { IDomainEventPublisher } from "Application/shared/DomainEvent/IDomainEventPublisher";
import { ITransactionManager } from "Application/shared/ITransactionManager";
import { IReviewRepository } from "Domain/models/Review/IReviewRepository";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";

export type DeleteReviewCommand = {
  reviewId: string;
};

@injectable()
export class DeleteReviewService {
  constructor(
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager,
    @inject("IDomainEventPublisher")
    private domainEventPublisher: IDomainEventPublisher
  ) {}

  async execute(command: DeleteReviewCommand): Promise<void> {
    const review = await this.transactionManager.begin(async () => {
      // 対象のレビューを取得して存在確認
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.reviewRepository.findById(reviewId);

      if (!review) {
        throw new Error("レビューが存在しません");
      }

      review.delete();

      await this.reviewRepository.delete(reviewId);

      return review;
    });

    const events = review.getDomainEvents();
    for (const event of events) {
      this.domainEventPublisher.publish(event);
    }
    review.clearDomainEvents();
  }
}
