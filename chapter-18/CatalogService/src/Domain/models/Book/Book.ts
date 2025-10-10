import { BookIdentity } from "./BookIdentity/BookIdentity";
import { Price } from "./Price/Price";

export class Book {
  constructor(
    private readonly _identity: BookIdentity,
    private _price: Price
  ) {}

  static create(identity: BookIdentity, price: Price): Book {
    return new Book(identity, price);
  }

  static reconstruct(identity: BookIdentity, price: Price): Book {
    return new Book(identity, price);
  }

  /**
   * 別の書籍と同一かどうかを判定
   * @param other 比較対象の書籍
   * @returns 同一の場合はtrue
   */
  equals(other: Book): boolean {
    return this._identity.equals(other._identity);
  }

  get bookId() {
    return this._identity.bookId;
  }

  get title() {
    return this._identity.title;
  }

  get author() {
    return this._identity.author;
  }

  get price() {
    return this._price;
  }

  changePrice(price: Price): void {
    this._price = price;
  }
}
