export type EditReviewDTO = {
  readonly id: string;
  readonly bookId: string;
  readonly name: string;
  readonly rating: number;
  readonly comment?: string;
};
