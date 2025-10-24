import { BookId } from "../Book/BookId/BookId";
import { Comment } from "./Comment/Comment";
import { Name } from "./Name/Name";
import { Rating } from "./Rating/Rating";
import { Review } from "./Review";
import { ReviewId } from "./ReviewId/ReviewId";
import { ReviewIdentity } from "./ReviewIdentity/ReviewIdentity";

describe("Review", () => {
  const reviewId = new ReviewId();
  const reviewIdentity = new ReviewIdentity(reviewId);
  const bookId = new BookId("9784798126708");
  const name = new Name("山田太郎");
  const rating = new Rating(4);
  const comment = new Comment(
    "とても面白かったです。『実践ドメイン駆動設計』を読んだ後にこの本を読むと理解しやすいです。"
  );

  describe("create", () => {
    it("レビューを正しく作成できる", () => {
      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );

      expect(review.reviewId.equals(reviewId)).toBeTruthy();
      expect(review.bookId.equals(bookId)).toBeTruthy();
      expect(review.name.equals(name)).toBeTruthy();
      expect(review.rating.equals(rating)).toBeTruthy();
      expect(review.comment?.equals(comment)).toBeTruthy();
    });
  });

  describe("reconstruct", () => {
    it("レビューを正しく再構築できる", () => {
      const review = Review.reconstruct(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );

      expect(review.reviewId.equals(reviewId)).toBeTruthy();
      expect(review.bookId.equals(bookId)).toBeTruthy();
      expect(review.name.equals(name)).toBeTruthy();
      expect(review.rating.equals(rating)).toBeTruthy();
      expect(review.comment?.equals(comment)).toBeTruthy();
    });
  });

  describe("equals", () => {
    it("同一のレビューは等しいと判定される", () => {
      const review1 = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );
      const review2 = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );

      expect(review1.equals(review2)).toBeTruthy();
    });

    it("異なるレビューは等しくないと判定される", () => {
      const review1 = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );
      const newReviewId = new ReviewId();
      const newReviewIdentity = new ReviewIdentity(newReviewId);
      const review2 = Review.create(
        newReviewIdentity,
        bookId,
        name,
        rating,
        comment
      );

      expect(review1.equals(review2)).toBeFalsy();
    });
  });

  describe("isTrustworthy", () => {
    it("コメントありの場合、評価とコメントの品質を組み合わせて信頼性を判断する", () => {
      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );

      // モックを使って特定の品質係数を返すように設定
      jest.spyOn(review.rating, "getQualityFactor").mockReturnValue(0.75);
      jest.spyOn(review.comment!, "getQualityFactor").mockReturnValue(0.3);

      // 評価の重み0.7、コメントの重み0.3で計算すると
      // 0.75 * 0.7 + 0.3 * 0.3 = 0.525 + 0.09 = 0.615
      // 閾値0.6に対して信頼できると判定されるはず
      expect(review.isTrustworthy(0.6)).toBeTruthy();

      // 閾値0.7に対しては信頼できないと判定されるはず
      expect(review.isTrustworthy(0.7)).toBeFalsy();
    });

    it("コメントなしの場合、評価の品質のみで信頼性を判断する", () => {
      const review = Review.create(reviewIdentity, bookId, name, rating);

      // モックを使って特定の品質係数を返すように設定
      jest.spyOn(review.rating, "getQualityFactor").mockReturnValue(0.5);

      // 評価の品質係数が0.5なので、閾値0.6に対して信頼できないと判定されるはず
      expect(review.isTrustworthy(0.6)).toBeFalsy();

      // 閾値0.4に対しては信頼できると判定されるはず
      expect(review.isTrustworthy(0.4)).toBeTruthy();
    });
  });

  describe("extractRecommendedBooks", () => {
    it("コメントがない場合は空の配列を返す", () => {
      const review = Review.create(reviewIdentity, bookId, name, rating);

      const recommendedBooks = review.extractRecommendedBooks();
      expect(recommendedBooks).toEqual([]);
    });

    it("コメントからパターンに一致する複数の推薦本を抽出できる", () => {
      // 複数の推薦本を含むコメント - パターンに確実に一致するよう調整
      const commentWithMultipleBooks = new Comment(
        "『実践ドメイン駆動設計』を読んだ後に読むと理解しやすいです。また、前提知識として『エリック・エヴァンスのドメイン駆動設計』が必要です。"
      );

      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        commentWithMultipleBooks
      );

      const result = review.extractRecommendedBooks();
      // 両方のパターンに一致するはず
      expect(result).toEqual([
        "実践ドメイン駆動設計",
        "エリック・エヴァンスのドメイン駆動設計",
      ]);
    });

    it("重複する推薦本は一度だけカウントされる", () => {
      // 同じ推薦本が複数のパターンに一致するコメント - パターンに確実に一致するよう調整
      const commentWithDuplicates = new Comment(
        "『実践ドメイン駆動設計』を読んだ後に読むと理解しやすいです。『実践ドメイン駆動設計』を先に読むことを推奨します。"
      );

      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        commentWithDuplicates
      );

      const result = review.extractRecommendedBooks();
      expect(result).toEqual(["実践ドメイン駆動設計"]);
    });
  });

  describe("updateName", () => {
    it("名前を変更できる", () => {
      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );
      const newName = new Name("佐藤花子");

      review.updateName(newName);

      expect(review.name.equals(newName)).toBeTruthy();
    });
  });

  describe("updateRating", () => {
    it("評価を変更できる", () => {
      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );
      const newRating = new Rating(5);

      review.updateRating(newRating);

      expect(review.rating.equals(newRating)).toBeTruthy();
    });
  });

  describe("editComment", () => {
    it("コメントを変更できる", () => {
      const review = Review.create(
        reviewIdentity,
        bookId,
        name,
        rating,
        comment
      );
      const newComment = new Comment("新しいコメントです。");

      review.editComment(newComment);

      expect(review.comment?.equals(newComment)).toBeTruthy();
    });
  });
});
