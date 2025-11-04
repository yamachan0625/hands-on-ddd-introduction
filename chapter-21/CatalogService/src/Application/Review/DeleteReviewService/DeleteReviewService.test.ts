import { container } from "tsyringe";

import { BookId } from "Domain/models/Book/BookId/BookId";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";
import { ReviewDomainEvent } from "Domain/shared/DomainEvent/Review/ReviewDomainEventFactory";
import { InMemoryEventStoreRepository } from "Infrastructure/InMemory/InMemory/InMemoryEventStoreRepository";

import {
  DeleteReviewCommand,
  DeleteReviewService,
} from "./DeleteReviewService";

describe("DeleteReviewService", () => {
  let eventStoreRepository: InMemoryEventStoreRepository;
  let deleteReviewService: DeleteReviewService;

  beforeEach(async () => {
    deleteReviewService = container.resolve(DeleteReviewService);
    eventStoreRepository = deleteReviewService[
      "eventStoreRepository"
    ] as InMemoryEventStoreRepository;
  });

  it("存在するレビューを削除することができる", async () => {
    const reviewId = "test-review-id";
    const bookId = "9784798126708";

    const review = Review.create(
      new ReviewIdentity(new ReviewId(reviewId)),
      new BookId(bookId),
      new Name("レビュアー名"),
      new Rating(4),
      new Comment("テストコメント")
    );

    await eventStoreRepository.store(review);

    // 作成されたことを確認
    const retrievedReview = await eventStoreRepository.find(
      review.reviewId.value,
      "Review",
      Review.reconstruct
    );
    expect(retrievedReview).not.toBeNull();

    // 削除を実行
    const command: DeleteReviewCommand = { reviewId };
    await deleteReviewService.execute(command);

    // ReviewDeletedイベントが記録されていることを確認
    await eventStoreRepository.find(
      review.reviewId.value,
      "Review",
      (events) => {
        const eventTypes = events.map((event) => event.eventType);
        // 各操作に対応するイベントが記録されていることを確認
        expect(eventTypes).toStrictEqual(["ReviewCreated", "ReviewDeleted"]);
        return Review.reconstruct(events as ReviewDomainEvent[]);
      }
    );
  });

  it("レビューが存在しない場合エラーを投げる", async () => {
    const command: DeleteReviewCommand = {
      reviewId: "non-existent-review",
    };

    await expect(deleteReviewService.execute(command)).rejects.toThrow(
      "レビューが存在しません"
    );
  });
});
