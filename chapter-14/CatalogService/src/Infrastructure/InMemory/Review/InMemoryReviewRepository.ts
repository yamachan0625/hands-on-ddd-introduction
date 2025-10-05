import { BookId } from "Domain/models/Book/BookId/BookId";
import { IReviewRepository } from "Domain/models/Review/IReviewRepository";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";

export class InMemoryReviewRepository implements IReviewRepository {
  private reviews: Map<string, Review> = new Map();

  async save(review: Review): Promise<void> {
    this.reviews.set(review.reviewId.value, review);
  }

  async update(review: Review): Promise<void> {
    if (!this.reviews.has(review.reviewId.value)) {
      throw new Error(`ID ${review.reviewId.value} のレビューが見つかりません`);
    }
    this.reviews.set(review.reviewId.value, review);
  }

  async delete(reviewId: ReviewId): Promise<void> {
    this.reviews.delete(reviewId.value);
  }

  async findById(reviewId: ReviewId): Promise<Review | null> {
    const review = this.reviews.get(reviewId.value);
    return review || null;
  }

  async findAllByBookId(bookId: BookId): Promise<Review[]> {
    const bookReviews: Review[] = [];
    this.reviews.forEach((review) => {
      if (review.bookId.value === bookId.value) {
        bookReviews.push(review);
      }
    });
    return bookReviews;
  }
}
