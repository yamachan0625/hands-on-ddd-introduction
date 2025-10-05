import { BookId } from "../Book/BookId/BookId";
import { Review } from "./Review";
import { ReviewId } from "./ReviewId/ReviewId";

export interface IReviewRepository {
  save(review: Review): Promise<void>;
  update(review: Review): Promise<void>;
  delete(reviewId: ReviewId): Promise<void>;
  findById(reviewId: ReviewId): Promise<Review | null>;
  findAllByBookId(bookId: BookId): Promise<Review[]>; // 特定の書籍のレビューを全て取得
  // 必要に応じて他の検索メソッドを追加
}
