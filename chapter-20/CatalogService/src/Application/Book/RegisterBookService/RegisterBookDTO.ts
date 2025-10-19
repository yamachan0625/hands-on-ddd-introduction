export type RegisterBookDTO = {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly price: {
    amount: number;
    currency: string;
  };
};
