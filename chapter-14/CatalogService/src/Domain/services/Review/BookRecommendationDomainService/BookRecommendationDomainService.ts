import { Review } from "../../../models/Review/Review";

export class BookRecommendationDomainService {
  constructor() {}

  /**
   * 信頼できるレビューをフィルタリング
   * @param reviews 対象のレビュー配列
   * @returns 信頼できるレビューの配列
   */
  getTrustworthyReviews(reviews: Review[]): Review[] {
    // 信頼性の閾値に基づいて信頼できるレビューのみをフィルタリング
    return reviews.filter((review) => review.isTrustworthy());
  }

  /**
   * レビューから推薦書籍を抽出
   * @param reviews 対象のレビュー配列
   * @param maxCount 最大取得数（デフォルト3）
   * @returns 推薦書籍のタイトル配列（最大maxCount個）
   */
  calculateTopRecommendedBooks(
    reviews: Review[],
    maxCount: number = 3
  ): string[] {
    // 信頼できるレビューを取得
    const trustworthyReviews = this.getTrustworthyReviews(reviews);

    // 信頼できるレビューから推薦書籍を抽出して言及頻度をカウント
    const recommendedBooks = trustworthyReviews.reduce((acc, review) => {
      const bookTitles = review.extractRecommendedBooks();
      bookTitles.forEach((title) => {
        acc[title] = (acc[title] || 0) + 1;
      });
      return acc;
    }, {} as { [title: string]: number });

    // 言及頻度順にソートして上位の書籍リストを生成
    return Object.entries(recommendedBooks)
      .sort((a, b) => b[1] - a[1]) // 言及回数の多い順にソート
      .slice(0, maxCount) // 上位maxCount冊を取得
      .map((entry) => entry[0]); // 書籍名のみを返す
  }
}
