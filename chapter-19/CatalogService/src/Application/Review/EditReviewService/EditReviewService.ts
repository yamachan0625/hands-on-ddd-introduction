import { inject, injectable } from "tsyringe";

import { ITransactionManager } from "Application/shared/ITransactionManager";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { IReviewRepository } from "Domain/models/Review/IReviewRepository";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";

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
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager
  ) {}

  async execute(command: EditReviewCommand): Promise<EditReviewDTO> {
    return await this.transactionManager.begin(async () => {
      // 対象のレビューを取得
      const reviewId = new ReviewId(command.reviewId);
      const review = await this.reviewRepository.findById(reviewId);

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

      await this.reviewRepository.update(review);

      return {
        id: review.reviewId.value,
        bookId: review.bookId.value,
        name: review.name.value,
        rating: review.rating.value,
        comment: review.comment?.value,
      };
    });
  }
}
