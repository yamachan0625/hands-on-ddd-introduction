import { BookId } from "Domain/models/Book/BookId/BookId";
import { IReviewRepository } from "Domain/models/Review/IReviewRepository";
import { BookRecommendationDomainService } from "Domain/services/Review/BookRecommendationDomainService/BookRecommendationDomainService";

import { GetRecommendedBooksDTO } from "./GetRecommendedBooksDTO";

export type GetRecommendedBooksCommand = {
  bookId: string;
  maxCount?: number;
};

export class GetRecommendedBooksService {
  private bookRecommendationService: BookRecommendationDomainService;

  constructor(private reviewRepository: IReviewRepository) {
    this.bookRecommendationService = new BookRecommendationDomainService();
  }

  async execute(
    command: GetRecommendedBooksCommand
  ): Promise<GetRecommendedBooksDTO> {
    const bookId = new BookId(command.bookId);
    const reviews = await this.reviewRepository.findAllByBookId(bookId);

    // ドメインサービスを利用して推薦書籍を計算
    const recommendedBooks =
      this.bookRecommendationService.calculateTopRecommendedBooks(
        reviews,
        command.maxCount
      );

    return {
      sourceBookId: bookId.value,
      recommendedBooks: recommendedBooks,
    };
  }
}
