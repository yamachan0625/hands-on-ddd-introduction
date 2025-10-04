import { nanoid } from "nanoid";

import { ValueObject } from "../../shared/ValueObject";

type ReviewIdValue = string;
export class ReviewId extends ValueObject<ReviewIdValue, "ReviewId"> {
  static readonly MAX_LENGTH = 100;
  static readonly MIN_LENGTH = 1;

  constructor(value: ReviewIdValue = nanoid()) {
    super(value);
  }

  protected validate(value: ReviewIdValue): void {
    if (
      value.length < ReviewId.MIN_LENGTH ||
      value.length > ReviewId.MAX_LENGTH
    ) {
      throw new Error(
        `ReviewIdは${ReviewId.MIN_LENGTH}文字以上、${ReviewId.MAX_LENGTH}文字以下でなければなりません。`
      );
    }
  }
}
