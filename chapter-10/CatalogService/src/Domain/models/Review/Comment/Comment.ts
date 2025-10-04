import { ValueObject } from "../../shared/ValueObject";

type CommentValue = string;

export class Comment extends ValueObject<CommentValue, "Comment"> {
  static readonly MAX_LENGTH = 1000;
  static readonly MIN_LENGTH = 1;

  constructor(value: CommentValue) {
    super(value);
  }

  protected validate(value: CommentValue): void {
    if (
      value.length < Comment.MIN_LENGTH ||
      value.length > Comment.MAX_LENGTH
    ) {
      throw new Error(
        `コメントは${Comment.MIN_LENGTH}文字以上、${Comment.MAX_LENGTH}文字以下でなければなりません。`
      );
    }
  }

  /**
   * コメントの品質係数を返す (0.0 〜 1.0の範囲)
   */
  getQualityFactor(): number {
    const minLength = 10; // 最低文字数
    const optimalLength = 100; // 最適な文字数

    const length = this._value.trim().length;

    if (length < minLength) {
      return 0.2; // 短すぎるコメントは低い係数
    }

    if (length >= optimalLength) {
      return 1.0; // 十分な長さのコメントは最高係数
    }

    // minLengthからoptimalLengthまでの間は線形に増加
    return 0.2 + 0.8 * ((length - minLength) / (optimalLength - minLength));
  }

  /**
   * 文字列パターンにマッチする部分を抽出する
   */
  extractMatches(pattern: RegExp): string[] {
    const results: string[] = [];
    const text = this._value;

    // グローバルフラグが設定されていない場合は設定する
    const globalPattern = pattern.global
      ? pattern
      : new RegExp(pattern.source, pattern.flags + "g");

    let match;
    while ((match = globalPattern.exec(text)) !== null) {
      if (match[1]) results.push(match[1]);
    }

    return results;
  }
}
