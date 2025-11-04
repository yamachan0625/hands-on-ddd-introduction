import { Aggregate } from "../../shared/Aggregate";
import {
  ReviewDomainEvent,
  ReviewEventFactory,
} from "../../shared/DomainEvent/Review/ReviewDomainEventFactory";
import { BookId } from "../Book/BookId/BookId";
import { Comment } from "./Comment/Comment";
import { Name } from "./Name/Name";
import { Rating } from "./Rating/Rating";
import { ReviewId } from "./ReviewId/ReviewId";
import { ReviewIdentity } from "./ReviewIdentity/ReviewIdentity";

export class Review extends Aggregate<ReviewDomainEvent> {
  private constructor(
    private _identity: ReviewIdentity,
    private _bookId: BookId,
    private _name: Name,
    private _rating: Rating,
    private _comment?: Comment
  ) {
    super();
  }

  private static initialize(): Review {
    return new Review(undefined!, undefined!, undefined!, undefined!);
  }

  private applyEvent(event: ReviewDomainEvent): void {
    switch (event.eventType) {
      case "ReviewCreated": {
        const { reviewId, bookId, name, rating, comment } = event.eventBody;
        this._identity = new ReviewIdentity(new ReviewId(reviewId));
        this._bookId = new BookId(bookId);
        this._name = new Name(name);
        this._rating = new Rating(rating);
        this._comment = comment ? new Comment(comment) : undefined;
        break;
      }

      case "ReviewNameUpdated": {
        this._name = new Name(event.eventBody.name);
        break;
      }

      case "ReviewRatingUpdated": {
        this._rating = new Rating(event.eventBody.rating);
        break;
      }

      case "ReviewCommentEdited": {
        if (event.eventBody.comment) {
          this._comment = new Comment(event.eventBody.comment);
        }
        break;
      }

      case "ReviewDeleted": {
        break;
      }
    }
  }

  static create(
    identity: ReviewIdentity,
    bookId: BookId,
    name: Name,
    rating: Rating,
    comment?: Comment
  ): Review {
    const review = Review.initialize();
    const event = ReviewEventFactory.createReviewCreated(
      identity.reviewId,
      bookId,
      name,
      rating,
      comment
    );
    review.addDomainEvent(event);
    review.applyEvent(event);
    return review;
  }

  static reconstruct(events: ReviewDomainEvent[]): Review {
    if (events.length === 0) {
      throw new Error("イベントが空です");
    }

    const review = Review.initialize();
    for (const event of events) {
      review.applyEvent(event);
    }

    return review;
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
    const event = ReviewEventFactory.createReviewNameUpdated(
      this.reviewId,
      name
    );
    this.addDomainEvent(event);
    this.applyEvent(event);
  }

  updateRating(rating: Rating): void {
    const event = ReviewEventFactory.createReviewRatingUpdated(
      this.reviewId,
      rating
    );
    this.addDomainEvent(event);
    this.applyEvent(event);
  }

  editComment(comment: Comment): void {
    const event = ReviewEventFactory.createReviewCommentEdited(
      this.reviewId,
      comment
    );
    this.addDomainEvent(event);
    this.applyEvent(event);
  }

  delete(): void {
    const event = ReviewEventFactory.createReviewDeleted(this.reviewId);
    this.addDomainEvent(event);
  }
}
