import { BookId } from "../../../models/Book/BookId/BookId";
import { Comment } from "../../../models/Review/Comment/Comment";
import { Name } from "../../../models/Review/Name/Name";
import { Rating } from "../../../models/Review/Rating/Rating";
import { ReviewId } from "../../../models/Review/ReviewId/ReviewId";
import { DomainEvent } from "../DomainEvent";

type ReviewCreatedEvent = DomainEvent<
  "ReviewCreated",
  {
    reviewId: string;
    bookId: string;
    name: string;
    rating: number;
    comment?: string;
  }
>;
type ReviewNameUpdatedEvent = DomainEvent<
  "ReviewNameUpdated",
  {
    name: string;
  }
>;
type ReviewRatingUpdatedEvent = DomainEvent<
  "ReviewRatingUpdated",
  {
    rating: number;
  }
>;
type ReviewCommentEditedEvent = DomainEvent<
  "ReviewCommentEdited",
  {
    comment?: string;
  }
>;
type ReviewDeletedEvent = DomainEvent<"ReviewDeleted", Record<string, never>>;

// Review集約のすべてのドメインイベントを定義
export type ReviewDomainEvent =
  | ReviewCreatedEvent
  | ReviewNameUpdatedEvent
  | ReviewRatingUpdatedEvent
  | ReviewCommentEditedEvent
  | ReviewDeletedEvent;

export class ReviewEventFactory {
  static createReviewCreated(
    reviewId: ReviewId,
    bookId: BookId,
    name: Name,
    rating: Rating,
    comment?: Comment
  ): ReviewCreatedEvent {
    return DomainEvent.create(reviewId.value, "Review", "ReviewCreated", {
      reviewId: reviewId.value,
      bookId: bookId.value,
      name: name.value,
      rating: rating.value,
      comment: comment?.value,
    });
  }

  static createReviewNameUpdated(
    reviewId: ReviewId,
    name: Name
  ): ReviewNameUpdatedEvent {
    return DomainEvent.create(reviewId.value, "Review", "ReviewNameUpdated", {
      name: name.value,
    });
  }

  static createReviewRatingUpdated(
    reviewId: ReviewId,
    rating: Rating
  ): ReviewRatingUpdatedEvent {
    return DomainEvent.create(reviewId.value, "Review", "ReviewRatingUpdated", {
      rating: rating.value,
    });
  }

  static createReviewCommentEdited(
    reviewId: ReviewId,
    comment?: Comment
  ): ReviewCommentEditedEvent {
    return DomainEvent.create(reviewId.value, "Review", "ReviewCommentEdited", {
      comment: comment?.value,
    });
  }

  static createReviewDeleted(reviewId: ReviewId): ReviewDeletedEvent {
    return DomainEvent.create(reviewId.value, "Review", "ReviewDeleted", {});
  }
}
