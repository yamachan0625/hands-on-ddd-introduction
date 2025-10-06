-- Currency列挙型の作成
CREATE TYPE "Currency" AS ENUM ('JPY');

-- Bookテーブルの作成
CREATE TABLE IF NOT EXISTS "Book" (
  "bookId" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "priceAmount" DECIMAL(10, 2) NOT NULL,
  "priceCurrency" "Currency" NOT NULL DEFAULT 'JPY'
);

-- Reviewテーブルの作成
CREATE TABLE IF NOT EXISTS "Review" (
  "reviewId" TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  CONSTRAINT fk_book
    FOREIGN KEY("bookId")
    REFERENCES "Book"("bookId")
    ON DELETE CASCADE
);

-- BookIdによる検索を高速化するためのインデックス
CREATE INDEX IF NOT EXISTS "Review_bookId_idx" ON "Review"("bookId");