import { Author } from "Domain/models/Book/Author/Author";
import { Book } from "Domain/models/Book/Book";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { BookIdentity } from "Domain/models/Book/BookIdentity/BookIdentity";
import { Price } from "Domain/models/Book/Price/Price";
import { Title } from "Domain/models/Book/Title/Title";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";

import { SQLBookRepository } from "../Book/SQLBookRepository";
import pool from "../db";
import { SQLClientManager } from "../SQLClientManager";
import { SQLReviewRepository } from "./SQLReviewRepository";

// SQLClientManagerとRepositoryインスタンスを準備
const clientManager = new SQLClientManager();
const reviewRepository = new SQLReviewRepository(clientManager);
const bookRepository = new SQLBookRepository(clientManager);

describe("SQLReviewRepository", () => {
  // テスト用のサンプルBook
  const sampleBook = Book.reconstruct(
    new BookIdentity(
      new BookId("9784798126708"),
      new Title("エリック・エヴァンスのドメイン駆動設計入門"),
      new Author("エリック・エヴァンス")
    ),
    new Price({ amount: 5720, currency: "JPY" })
  );

  // 各テストの前にDBをクリーンアップ
  beforeEach(async () => {
    await pool.query("BEGIN");
    await pool.query('DELETE FROM "Review"');
    await pool.query('DELETE FROM "Book"');
    // 外部キー制約があるのでBookを先に作成
    await bookRepository.save(sampleBook);
    await pool.query("COMMIT");
  });

  // テスト後にDBコネクションを片付け
  afterAll(async () => {
    await pool.end();
  });

  // ヘルパー関数: レビュー作成
  const createSampleReview = (
    reviewId: string,
    name: string = "テストユーザー",
    rating: number = 5,
    commentText?: string
  ): Review => {
    const comment = commentText ? new Comment(commentText) : undefined;

    return Review.create(
      new ReviewIdentity(new ReviewId(reviewId)),
      sampleBook.bookId,
      new Name(name),
      new Rating(rating),
      comment
    );
  };

  describe("save/findById", () => {
    test("saveしたレビューがfindByIdで取得できる", async () => {
      const review = createSampleReview(
        "review-1",
        "山田太郎",
        5,
        "とても良い本でした。"
      );

      await reviewRepository.save(review);

      const found = await reviewRepository.findById(new ReviewId("review-1"));

      expect(found).not.toBeNull();
      expect(found?.reviewId.equals(review.reviewId)).toBeTruthy();
      expect(found?.bookId.equals(sampleBook.bookId)).toBeTruthy();
      expect(found?.name.equals(review.name)).toBeTruthy();
      expect(found?.rating.equals(review.rating)).toBeTruthy();
      expect(found?.comment?.equals(review.comment!)).toBeTruthy();
    });

    test("存在しないIDでfindByIdはnullを返す", async () => {
      const nonExistentId = new ReviewId("non-existent-review");
      const found = await reviewRepository.findById(nonExistentId);
      expect(found).toBeNull();
    });
  });

  describe("update", () => {
    test("updateで既存のレビューを更新できる", async () => {
      const review = createSampleReview(
        "review-2",
        "佐藤次郎",
        4,
        "まあまあでした。"
      );
      await reviewRepository.save(review);

      // レビュー情報を更新
      const updatedName = new Name("佐藤次郎（更新）");
      review.updateName(updatedName);
      await reviewRepository.update(review);

      const found = await reviewRepository.findById(new ReviewId("review-2"));
      expect(found).not.toBeNull();
      expect(found?.name.equals(updatedName)).toBeTruthy(); // 更新された名前
    });

    test("存在しないレビューのupdateでエラーが発生する", async () => {
      const nonExistingReview = createSampleReview("non-existent-review");

      await expect(
        reviewRepository.update(nonExistingReview)
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    test("deleteで既存のレビューを削除できる", async () => {
      const review = createSampleReview(
        "review-3",
        "鈴木三郎",
        3,
        "普通でした。"
      );
      await reviewRepository.save(review);

      // レビューを削除
      await reviewRepository.delete(new ReviewId("review-3"));

      // 削除後は見つからない
      const found = await reviewRepository.findById(new ReviewId("review-3"));
      expect(found).toBeNull();
    });
  });

  describe("findAllByBookId", () => {
    test("findAllByBookIdで特定書籍のレビュー全てを取得できる", async () => {
      // 同じ書籍に複数のレビューを作成
      const review1 = createSampleReview(
        "review-4",
        "田中四郎",
        5,
        "最高でした！"
      );
      const review2 = createSampleReview(
        "review-5",
        "高橋五郎",
        4,
        "良かったです。"
      );
      const review3 = createSampleReview(
        "review-6",
        "伊藤六郎",
        3,
        "まあまあでした。"
      );

      await reviewRepository.save(review1);
      await reviewRepository.save(review2);
      await reviewRepository.save(review3);

      // 書籍IDでレビューを全件検索
      const reviews = await reviewRepository.findAllByBookId(sampleBook.bookId);

      // 3件のレビューが見つかることを確認
      expect(reviews.length).toBe(3);

      // reviewIdでソートして全部のレビューが含まれるか確認
      const sortedReviews = reviews.sort((a, b) =>
        a.reviewId.value.localeCompare(b.reviewId.value)
      );
      expect(sortedReviews[0].reviewId.value).toBe("review-4");
      expect(sortedReviews[1].reviewId.value).toBe("review-5");
      expect(sortedReviews[2].reviewId.value).toBe("review-6");
    });
  });
});
