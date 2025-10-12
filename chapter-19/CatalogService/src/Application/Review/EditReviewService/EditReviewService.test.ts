import { container } from "tsyringe";

import { BookId } from "Domain/models/Book/BookId/BookId";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";
import { InMemoryReviewRepository } from "Infrastructure/InMemory/Review/InMemoryReviewRepository";

import { EditReviewDTO } from "./EditReviewDTO";
import { EditReviewCommand, EditReviewService } from "./EditReviewService";

describe("EditReviewService", () => {
  let reviewRepository: InMemoryReviewRepository;
  let editReviewService: EditReviewService;

  beforeEach(async () => {
    editReviewService = container.resolve(EditReviewService);
    reviewRepository = editReviewService[
      "reviewRepository"
    ] as InMemoryReviewRepository;
  });

  it("存在するレビューを編集することができる", async () => {
    const reviewId = "test-review-id";
    const bookId = "9784798126708";

    const review = Review.create(
      new ReviewIdentity(new ReviewId(reviewId)),
      new BookId(bookId),
      new Name("元の名前"),
      new Rating(3),
      new Comment("元のコメント")
    );

    await reviewRepository.save(review);

    const command: EditReviewCommand = {
      reviewId,
      name: "新しい名前",
      rating: 5,
      comment: "新しいコメント",
    };

    const result = await editReviewService.execute(command);

    // DTOの内容を検証
    expect(result).toEqual<EditReviewDTO>({
      id: reviewId,
      bookId: bookId,
      name: "新しい名前",
      rating: 5,
      comment: "新しいコメント",
    });

    // 変更が反映されたか確認
    const updatedReview = await reviewRepository.findById(
      new ReviewId(reviewId)
    );
    expect(updatedReview).not.toBeNull();
    expect(updatedReview?.name.value).toBe("新しい名前");
    expect(updatedReview?.rating.value).toBe(5);
    expect(updatedReview?.comment?.value).toBe("新しいコメント");
  });

  it("レビューが存在しない場合エラーを投げる", async () => {
    const command: EditReviewCommand = {
      reviewId: "non-existent-review",
      name: "新しい名前",
    };

    await expect(editReviewService.execute(command)).rejects.toThrow(
      "レビューが存在しません"
    );
  });
});
