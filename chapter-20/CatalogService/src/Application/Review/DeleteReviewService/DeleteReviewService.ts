import { inject, injectable } from 'tsyringe';

import { ITransactionManager } from 'Application/shared/ITransactionManager';
import { IReviewRepository } from 'Domain/models/Review/IReviewRepository';
import { ReviewId } from 'Domain/models/Review/ReviewId/ReviewId';
import { IEventStoreRepository } from 'Domain/shared/DomainEvent/IEventStoreRepository';

export type DeleteReviewCommand = {
  reviewId: string;
};

@injectable()
export class DeleteReviewService {
  constructor(
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: DeleteReviewCommand): Promise<void> {
    await this.transactionManager.begin(async () => {
      // 対象のレビューを取得して存在確認
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.reviewRepository.findById(reviewId);

      if (!review) {
        throw new Error("レビューが存在しません");
      }

      review.delete();

      await this.reviewRepository.delete(reviewId);
      await this.eventStoreRepository.store(review);

      return review;
    });
  }
}
