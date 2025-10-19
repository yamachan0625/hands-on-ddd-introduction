import { inject, injectable } from "tsyringe";

import { IDomainEventPublisher } from "Application/shared/DomainEvent/IDomainEventPublisher";
import { ITransactionManager } from "Application/shared/ITransactionManager";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { IBookRepository } from "Domain/models/Book/IBookRepository";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { IReviewRepository } from "Domain/models/Review/IReviewRepository";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";

import { AddReviewDTO } from "./AddReviewDTO";

export type AddReviewCommand = {
  bookId: string;
  name: string;
  rating: number;
  comment?: string;
};

@injectable()
export class AddReviewService {
  constructor(
    @inject("IReviewRepository")
    private reviewRepository: IReviewRepository,
    @inject("IBookRepository")
    private bookRepository: IBookRepository,
    @inject("ITransactionManager")
    private transactionManager: ITransactionManager,
    @inject("IDomainEventPublisher")
    private domainEventPublisher: IDomainEventPublisher
  ) {}

  async execute(command: AddReviewCommand): Promise<AddReviewDTO> {
    // 対象の書籍が存在するか確認
    const book = await this.bookRepository.findById(new BookId(command.bookId));

    if (!book) {
      throw new Error("書籍が存在しません");
    }

    const review = await this.transactionManager.begin(async () => {
      const reviewId = new ReviewId();
      const reviewIdentity = new ReviewIdentity(reviewId);
      const name = new Name(command.name);
      const rating = new Rating(command.rating);
      const comment = command.comment
        ? new Comment(command.comment)
        : undefined;

      const review = Review.create(
        reviewIdentity,
        book.bookId,
        name,
        rating,
        comment
      );

      await this.reviewRepository.save(review);

      return review;
    });

    const events = review.getDomainEvents();
    for (const event of events) {
      this.domainEventPublisher.publish(event);
    }
    review.clearDomainEvents();

    return {
      id: review.reviewId.value,
      bookId: review.bookId.value,
      name: review.name.value,
      rating: review.rating.value,
      comment: review.comment?.value,
    };
  }
}
