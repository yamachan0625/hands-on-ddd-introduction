import { MockTransactionManager } from "Application/shared/MockTransactionManager";
import { Author } from "Domain/models/Book/Author/Author";
import { Book } from "Domain/models/Book/Book";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { BookIdentity } from "Domain/models/Book/BookIdentity/BookIdentity";
import { Price } from "Domain/models/Book/Price/Price";
import { Title } from "Domain/models/Book/Title/Title";
import { ReviewId } from "Domain/models/Review/ReviewId/ReviewId";
import { InMemoryBookRepository } from "Infrastructure/InMemory/Book/InMemoryBookRepository";
import { InMemoryReviewRepository } from "Infrastructure/InMemory/Review/InMemoryReviewRepository";

import { AddReviewDTO } from "./AddReviewDTO";
import { AddReviewCommand, AddReviewService } from "./AddReviewService";

describe("AddReviewService", () => {
  let reviewRepository: InMemoryReviewRepository;
  let bookRepository: InMemoryBookRepository;
  let addReviewService: AddReviewService;

  beforeEach(async () => {
    reviewRepository = new InMemoryReviewRepository();
    bookRepository = new InMemoryBookRepository();
    const mockTransactionManager = new MockTransactionManager();
    addReviewService = new AddReviewService(
      reviewRepository,
      bookRepository,
      mockTransactionManager
    );
  });

  it("存在する書籍に対してレビューを追加することができる", async () => {
    const bookId = "9784798126708";
    const book = Book.create(
      new BookIdentity(
        new BookId(bookId),
        new Title("テスト書籍"),
        new Author("テスト著者")
      ),
      new Price({
        amount: 1500,
        currency: "JPY",
      })
    );

    await bookRepository.save(book);

    const command: Required<AddReviewCommand> = {
      bookId,
      name: "レビュアー1",
      rating: 5,
      comment: "とても良い本でした",
    };

    const result = await addReviewService.execute(command);

    // DTOの内容を検証
    expect(result).toEqual<AddReviewDTO>({
      id: expect.any(String), // IDは自動生成されるため、具体的な値は期待しない
      bookId: bookId,
      name: command.name,
      rating: command.rating,
      comment: command.comment,
    });

    // レビューが正しく保存されたか確認
    const savedReview = await reviewRepository.findById(
      new ReviewId(result.id)
    );
    expect(savedReview).not.toBeNull();
  });

  it("書籍が存在しない場合エラーを投げる", async () => {
    const command: Required<AddReviewCommand> = {
      bookId: "9784798126708", // 未登録の書籍ID
      name: "レビュアー1",
      rating: 5,
      comment: "とても良い本でした",
    };

    await expect(addReviewService.execute(command)).rejects.toThrow(
      "書籍が存在しません"
    );
  });
});
