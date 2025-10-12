import { Author } from "Domain/models/Book/Author/Author";
import { Book } from "Domain/models/Book/Book";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { BookIdentity } from "Domain/models/Book/BookIdentity/BookIdentity";
import { Price } from "Domain/models/Book/Price/Price";
import { Title } from "Domain/models/Book/Title/Title";

import pool from "../db";
import { SQLClientManager } from "../SQLClientManager";
import { SQLBookRepository } from "./SQLBookRepository";

// テスト用のSQLClientManagerとRepositoryインスタンス
const clientManager = new SQLClientManager();
const repository = new SQLBookRepository(clientManager);

describe("SQLBookRepository", () => {
  // 各テストの前にDBをクリーンアップ
  beforeEach(async () => {
    await pool.query("BEGIN");
    await pool.query('DELETE FROM "Review"');
    await pool.query('DELETE FROM "Book"');
    await pool.query("COMMIT");
  });

  // テスト後にDBコネクションを片付け
  afterAll(async () => {
    await pool.end();
  });

  describe("save/findById", () => {
    test("saveした集約がfindByIdで取得できる", async () => {
      const bookId = new BookId("9784798126708"); // 実際の値と一致させる
      const title = new Title("エリック・エヴァンスのドメイン駆動設計入門"); // 実際の値と一致させる
      const author = new Author("エリック・エヴァンス"); // 実際の値と一致させる
      const price = new Price({ amount: 5720, currency: "JPY" }); // 実際の値と一致させる
      const book = Book.reconstruct(
        new BookIdentity(bookId, title, author),
        price
      );

      await repository.save(book);

      const found = await repository.findById(bookId);
      expect(found).not.toBeNull();
      expect(found?.bookId.equals(bookId)).toBeTruthy();
      expect(found?.title.equals(title)).toBeTruthy();
      expect(found?.author.equals(author)).toBeTruthy();
      expect(found?.price.equals(price)).toBeTruthy();
    });

    test("存在しないIDでfindByIdはnullを返す", async () => {
      const nonExistentId = new BookId("9780720612974"); // DBに存在しないIDを指定
      const found = await repository.findById(nonExistentId);
      expect(found).toBeNull();
    });
  });
});
