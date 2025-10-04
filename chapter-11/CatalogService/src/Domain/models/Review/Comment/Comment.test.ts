import { Comment } from "./Comment";

describe("Comment", () => {
  test("Commentが1文字で作成できる", () => {
    expect(new Comment("a").value).toBe("a");
  });

  test("Commentが1000文字で作成できる", () => {
    const longComment = "a".repeat(1000);
    expect(new Comment(longComment).value).toBe(longComment);
  });

  test("最小長未満の値でCommentを生成するとエラーを投げる", () => {
    expect(() => new Comment("")).toThrow(
      "コメントは1文字以上、1000文字以下でなければなりません。"
    );
  });

  test("最大長を超える値でCommentを生成するとエラーを投げる", () => {
    const tooLongComment = "a".repeat(1001);
    expect(() => new Comment(tooLongComment)).toThrow(
      "コメントは1文字以上、1000文字以下でなければなりません。"
    );
  });

  test("getQualityFactor() 短いコメントの品質係数が正しく計算される", () => {
    expect(new Comment("短すぎる").value.length).toBeLessThan(10);
    expect(new Comment("短すぎる").getQualityFactor()).toBe(0.2);
  });

  test("getQualityFactor() 十分な長さのコメントの品質係数が正しく計算される", () => {
    const longEnoughComment = "a".repeat(100);
    expect(new Comment(longEnoughComment).getQualityFactor()).toBe(1.0);
  });

  test("getQualityFactor() 中間の長さのコメントの品質係数が正しく計算される", () => {
    // 50文字のコメント（10と100の中間）
    const mediumComment = "a".repeat(50);
    // (50 - 10) / (100 - 10) * 0.8 + 0.2 = 0.56
    expect(new Comment(mediumComment).getQualityFactor()).toBeCloseTo(0.56, 2);
  });

  test("extractMatches() 指定したパターンに一致する文字列を抽出できる", () => {
    const comment = new Comment(
      "この本は#素晴らしい です。#おすすめ #買って損なし"
    );
    // \w+ を [^\s]+ に変更 - 空白文字以外の文字シーケンスにマッチ
    const matches = comment.extractMatches(/#([^\s]+)/g);
    expect(matches).toEqual(["素晴らしい", "おすすめ", "買って損なし"]);
  });

  test("extractMatches() 一致するパターンがない場合は空配列を返す", () => {
    const comment = new Comment("特別なパターンはありません");
    // こちらも同じパターンに合わせる
    const matches = comment.extractMatches(/#([^\s]+)/g);
    expect(matches).toEqual([]);
  });
});
