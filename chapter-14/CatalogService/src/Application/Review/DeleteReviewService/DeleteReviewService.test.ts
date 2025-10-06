import { MockTransactionManager } from "Application/shared/MockTransactionManager";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";
import { InMemoryReviewRepository } from "Infrastructure/InMemory/Review/InMemoryReviewRepository";

import {
  DeleteReviewCommand,
  DeleteReviewService,
} from "./DeleteReviewService";

describe("DeleteReviewService", () => {
  let reviewRepository: InMemoryReviewRepository;
  let mockTransactionManager: MockTransactionManager;
  let deleteReviewService: DeleteReviewService;

  beforeEach(async () => {
    reviewRepository = new InMemoryReviewRepository();
    mockTransactionManager = new MockTransactionManager();
    deleteReviewService = new DeleteReviewService(
      reviewRepository,
      mockTransactionManager
    );
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

    await reviewRepository.save(review);

    // 作成されたことを確認
    let retrievedReview = await reviewRepository.findById(
      new ReviewId(reviewId)
    );
    expect(retrievedReview).not.toBeNull();

    // 削除を実行
    const command: DeleteReviewCommand = { reviewId };
    await deleteReviewService.execute(command);

    // 削除されたことを確認
    retrievedReview = await reviewRepository.findById(new ReviewId(reviewId));
    expect(retrievedReview).toBeNull();
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
