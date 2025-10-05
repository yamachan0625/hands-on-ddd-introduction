import { BookId } from "../Book/BookId/BookId";
import { Comment } from "./Comment/Comment";
import { Name } from "./Name/Name";
import { Rating } from "./Rating/Rating";
import { ReviewIdentity } from "./ReviewIdentity/ReviewIdentity";

export class Review {
  private constructor(
    private readonly _identity: ReviewIdentity,
    private readonly _bookId: BookId,
    private _name: Name,
    private _rating: Rating,
    private _comment?: Comment
  ) {}

  static create(
    identity: ReviewIdentity,
    bookId: BookId,
    name: Name,
    rating: Rating,
    comment?: Comment
  ): Review {
    return new Review(identity, bookId, name, rating, comment);
  }

  static reconstruct(
    identity: ReviewIdentity,
    bookId: BookId,
    name: Name,
    rating: Rating,
    comment?: Comment
  ): Review {
    return new Review(identity, bookId, name, rating, comment);
  }

  /**
   * このレビューが信頼できるかを判断
   * @param threshold 信頼性閾値（0.0〜1.0）
   * @returns 信頼できる場合はtrue
   */
  isTrustworthy(threshold: number = 0.6): boolean {
    // コメントがない場合は評価のみで判断
    if (!this._comment) {
      return this._rating.getQualityFactor() >= threshold;
    }

    // 評価とコメントの係数を組み合わせる
    const ratingFactor = this._rating.getQualityFactor();
    const commentFactor = this._comment.getQualityFactor();

    // 評価の重みを0.7、コメントの重みを0.3とする
    const combinedFactor = ratingFactor * 0.7 + commentFactor * 0.3;

    return combinedFactor >= threshold;
  }

  /**
   * コメントから推薦本を抽出する
   * @returns 推薦本のタイトル配列
   */
  extractRecommendedBooks(): string[] {
    if (!this._comment) return [];

    // 書籍名の後30文字以内に推薦キーワードがあるものを抽出
    const pattern =
      /[『「]([^』」]+)[』」][^。]{0,30}(?:読む|読んだ|学ぶ|学んだ|必要|推奨|おすすめ|良い|いい|理解)/g;

    const matches = this._comment.extractMatches(pattern);
    return Array.from(new Set(matches));
  }

  /**
   * 別のレビューと同一かどうかを判定
   * @param other 比較対象のレビュー
   * @returns 同一の場合はtrue
   */
  equals(other: Review): boolean {
    return this._identity.equals(other._identity);
  }

  get reviewId() {
    return this._identity.reviewId;
  }

  get bookId(): BookId {
    return this._bookId;
  }

  get name(): Name {
    return this._name;
  }

  get rating(): Rating {
    return this._rating;
  }

  get comment(): Comment | undefined {
    return this._comment;
  }

  updateName(name: Name): void {
    this._name = name;
  }

  updateRating(rating: Rating): void {
    this._rating = rating;
  }

  editComment(comment: Comment): void {
    this._comment = comment;
  }
}
