import { MockTransactionManager } from "Application/shared/MockTransactionManager";
import { Author } from "Domain/models/Book/Author/Author";
import { Book } from "Domain/models/Book/Book";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { BookIdentity } from "Domain/models/Book/BookIdentity/BookIdentity";
import { Price } from "Domain/models/Book/Price/Price";
import { Title } from "Domain/models/Book/Title/Title";
import { InMemoryBookRepository } from "Infrastructure/InMemory/Book/InMemoryBookRepository";

import { RegisterBookDTO } from "./RegisterBookDTO";
import {
  RegisterBookCommand,
  RegisterBookService,
} from "./RegisterBookService";

describe("RegisterBookService", () => {
  let repository: InMemoryBookRepository;
  let registerBookService: RegisterBookService;

  beforeEach(async () => {
    repository = new InMemoryBookRepository();
    registerBookService = new RegisterBookService(
      repository,
      new MockTransactionManager()
    );
  });

  it("登録済み書籍が存在しない場合書籍が正常に作成できる", async () => {
    const command: Required<RegisterBookCommand> = {
      isbn: "9784798126708",
      title: "エリック・エヴァンスのドメイン駆動設計",
      author: "エリック・エヴァンス",
      price: 5720,
    };

    const result = await registerBookService.execute(command);

    // DTOの内容を検証
    expect(result).toEqual<RegisterBookDTO>({
      id: command.isbn,
      title: command.title,
      author: command.author,
      price: {
        amount: command.price,
        currency: "JPY",
      },
    });

    // リポジトリに保存されていることを確認
    const createdBook = await repository.findById(new BookId(command.isbn));
    expect(createdBook).not.toBeNull();
  });

  it("登録済み書籍が存在する場合エラーを投げる", async () => {
    // テスト用に重複する書籍データを作成
    const bookId = new BookId("9784798126708");
    const title = new Title("エリック・エヴァンスのドメイン駆動設計");
    const author = new Author("エリック・エヴァンス");
    const price = new Price({ amount: 5720, currency: "JPY" });
    const bookIdentity = new BookIdentity(bookId, title, author);
    const book = Book.create(bookIdentity, price);

    await repository.save(book);

    // 同じBookIdで登録を試みる
    const command: Required<RegisterBookCommand> = {
      isbn: "9784798126708",
      title: "エリック・エヴァンスのドメイン駆動設計",
      author: "エリック・エヴァンス",
      price: 5720,
    };

    await expect(registerBookService.execute(command)).rejects.toThrow();
  });
});
