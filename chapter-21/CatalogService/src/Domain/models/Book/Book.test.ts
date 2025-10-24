import { Author } from "./Author/Author";
import { Book } from "./Book";
import { BookId } from "./BookId/BookId";
import { BookIdentity } from "./BookIdentity/BookIdentity";
import { Price } from "./Price/Price";
import { Title } from "./Title/Title";

describe("Book", () => {
  // テスト用の値オブジェクトを作成
  const bookId = new BookId("9784798126708");
  const title = new Title("エリック・エヴァンスのドメイン駆動設計入門");
  const author = new Author("エリック・エヴァンス");
  const price = new Price({ amount: 5720, currency: "JPY" });
  const newPrice = new Price({ amount: 5200, currency: "JPY" });

  // BookIdentityインスタンスを作成
  const bookIdentity = new BookIdentity(bookId, title, author);

  describe("create", () => {
    it("書籍を正しく作成できる", () => {
      const book = Book.create(bookIdentity, price);

      expect(book.bookId).toBe(bookId);
      expect(book.title).toBe(title);
      expect(book.author).toBe(author);
      expect(book.price).toBe(price);
    });
  });

  describe("reconstruct", () => {
    it("書籍を正しく再構築できる", () => {
      const book = Book.reconstruct(bookIdentity, price);

      expect(book.bookId).toBe(bookId);
      expect(book.title).toBe(title);
      expect(book.author).toBe(author);
      expect(book.price).toBe(price);
    });
  });

  describe("equals", () => {
    it("同じBookIdentityを持つ書籍は等価と判定される", () => {
      const book1 = Book.create(bookIdentity, price);
      const book2 = Book.create(bookIdentity, newPrice);

      expect(book1.equals(book2)).toBeTruthy();
    });

    it("異なるBookIdentityを持つ書籍は等価でないと判定される", () => {
      const book1 = Book.create(bookIdentity, price);
      const newBookId = new BookId("9784167158058");
      const newBookIdentity = new BookIdentity(newBookId, title, author);
      const book2 = Book.create(newBookIdentity, price);

      expect(book1.equals(book2)).toBeFalsy();
    });
  });

  describe("changePrice", () => {
    it("価格を変更できる", () => {
      const book = Book.create(bookIdentity, price);

      // 価格変更前の検証
      expect(book.price).toBe(price);

      // 価格を変更
      book.changePrice(newPrice);

      // 価格変更後の検証
      expect(book.price).toBe(newPrice);
    });
  });
});
