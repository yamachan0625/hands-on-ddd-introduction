import { inject, injectable } from "tsyringe";

import { ITransactionManager } from "Application/shared/ITransactionManager";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { IEventStoreRepository } from "Domain/shared/DomainEvent/IEventStoreRepository";

import { EditReviewDTO } from "./EditReviewDTO";

export type EditReviewCommand = {
  reviewId: string;
  name?: string;
  rating?: number;
  comment?: string;
};

@injectable()
export class EditReviewService {
  constructor(
    @inject("IEventStoreRepository")
    private eventStoreRepository: IEventStoreRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: EditReviewCommand): Promise<EditReviewDTO> {
    const review = await this.transactionManager.begin(async () => {
      // 対象のレビューを取得
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.eventStoreRepository.find(
        reviewId.value,
        "Review",
        Review.reconstruct
      );

      if (!review) {
        throw new Error("レビューが存在しません");
      }

      if (command.name !== undefined) {
        const name = new Name(command.name);
        review.updateName(name);
      }

      if (command.rating !== undefined) {
        const rating = new Rating(command.rating);
        review.updateRating(rating);
      }

      if (command.comment !== undefined) {
        const comment = new Comment(command.comment);
        review.editComment(comment);
      }

      await this.eventStoreRepository.store(review);

      return review;
    });

    return {
      id: review.reviewId.value,
      bookId: review.bookId.value,
      name: review.name.value,
      rating: review.rating.value,
      comment: review.comment?.value,
    };
  }
}
