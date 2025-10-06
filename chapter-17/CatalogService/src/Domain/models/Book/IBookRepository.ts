import { Book } from "./Book";
import { BookId } from "./BookId/BookId";

export interface IBookRepository {
  save(book: Book): Promise<void>;
  findById(bookId: BookId): Promise<Book | null>;
  // 必要に応じて他のメソッドを追加
}
