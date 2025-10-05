import { Book } from "Domain/models/Book/Book";
import { BookId } from "Domain/models/Book/BookId/BookId";
import { IBookRepository } from "Domain/models/Book/IBookRepository";

export class InMemoryBookRepository implements IBookRepository {
  private books: Map<string, Book> = new Map();

  async save(book: Book): Promise<void> {
    this.books.set(book.bookId.value, book);
  }

  async findById(bookId: BookId): Promise<Book | null> {
    const book = this.books.get(bookId.value);
    return book || null;
  }
}
