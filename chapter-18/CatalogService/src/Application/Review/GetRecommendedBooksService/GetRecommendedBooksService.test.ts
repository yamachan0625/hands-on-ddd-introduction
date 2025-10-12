import { container } from "tsyringe";

import { BookId } from "Domain/models/Book/BookId/BookId";
import { Comment } from "Domain/models/Review/Comment/Comment";
import { Name } from "Domain/models/Review/Name/Name";
import { Rating } from "Domain/models/Review/Rating/Rating";
import { Review } from "Domain/models/Review/Review";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { ReviewIdentity } from "Domain/models/Review/ReviewIdentity/ReviewIdentity";
import { InMemoryReviewRepository } from "Infrastructure/InMemory/Review/InMemoryReviewRepository";

import { GetRecommendedBooksDTO } from "./GetRecommendedBooksDTO";
import {
  GetRecommendedBooksCommand,
  GetRecommendedBooksService,
} from "./GetRecommendedBooksService";

describe("GetRecommendedBooksService", () => {
  let reviewRepository: InMemoryReviewRepository;
  let getRecommendedBooksService: GetRecommendedBooksService;

  beforeEach(async () => {
    getRecommendedBooksService = container.resolve(GetRecommendedBooksService);
    reviewRepository = getRecommendedBooksService[
      "reviewRepository"
    ] as InMemoryReviewRepository;
  });

  it("書籍IDから推薦書籍のリストを取得できる", async () => {
    const targetBookId = "9784814400737";

    // 信頼できるレビューを作成（高い評価とコメント）
    const review1 = Review.create(
      new ReviewIdentity(new ReviewId("review-1")),
      new BookId(targetBookId),
      new Name("レビュアー1"),
      new Rating(5),
      new Comment(
        "この本は素晴らしい！前提知識として『実践ドメイン駆動設計』が必要です。"
      )
    );
    const review2 = Review.create(
      new ReviewIdentity(new ReviewId("review-2")),
      new BookId(targetBookId),
      new Name("レビュアー2"),
      new Rating(4),
      new Comment(
        "『エリック・エヴァンスのドメイン駆動設計』を先に読むことを推奨します。理解が深まります。"
      )
    );
    const review3 = Review.create(
      new ReviewIdentity(new ReviewId("review-3")),
      new BookId(targetBookId),
      new Name("レビュアー3"),
      new Rating(5),
      new Comment(
        "『実践ドメイン駆動設計』の内容を理解してからこの本を読むと良いです。"
      )
    );

    await reviewRepository.save(review1);
    await reviewRepository.save(review2);
    await reviewRepository.save(review3);

    const command: GetRecommendedBooksCommand = {
      bookId: targetBookId,
      maxCount: 1,
    };

    const result = await getRecommendedBooksService.execute(command);

    expect(result).toEqual<GetRecommendedBooksDTO>({
      sourceBookId: command.bookId,
      recommendedBooks: ["実践ドメイン駆動設計"],
    });
  });

  it("書籍IDに対するレビューがない場合は空の配列を返す", async () => {
    const command: GetRecommendedBooksCommand = {
      bookId: "9784798126708",
    };

    const result = await getRecommendedBooksService.execute(command);

    expect(result).toEqual<GetRecommendedBooksDTO>({
      sourceBookId: command.bookId,
      recommendedBooks: [],
    });
  });
});
