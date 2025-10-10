import { ValueObject } from "../../shared/ValueObject";

type NameValue = string;
export class Name extends ValueObject<NameValue, "Name"> {
  static readonly MAX_LENGTH = 50;
  static readonly MIN_LENGTH = 1;

  constructor(value: NameValue) {
    super(value);
  }

  protected validate(value: NameValue): void {
    if (value.length < Name.MIN_LENGTH || value.length > Name.MAX_LENGTH) {
      throw new Error(
        `投稿者名は${Name.MIN_LENGTH}文字以上、${Name.MAX_LENGTH}文字以下でなければなりません。`
      );
    }
  }
}
