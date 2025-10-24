import { ReviewId } from '../ReviewId/ReviewId';

export class ReviewIdentity {
  /** レビューの一意の識別子 */
  constructor(private readonly _reviewId: ReviewId) {}

  // 同一性判定
  equals(other: ReviewIdentity): boolean {
    return this._reviewId.equals(other._reviewId);
  }

  get reviewId(): ReviewId {
    return this._reviewId;
  }
}
