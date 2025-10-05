import { Name } from "./Name";

describe("Name", () => {
  test("Nameが1文字で作成できる", () => {
    expect(new Name("a").value).toBe("a");
  });

  test("Nameが50文字で作成できる", () => {
    const longName = "a".repeat(50);
    expect(new Name(longName).value).toBe(longName);
  });

  test("最小長未満の値でNameを生成するとエラーを投げる", () => {
    expect(() => new Name("")).toThrow(
      "投稿者名は1文字以上、50文字以下でなければなりません。"
    );
  });

  test("最大長を超える値でNameを生成するとエラーを投げる", () => {
    const tooLongName = "a".repeat(51);
    expect(() => new Name(tooLongName)).toThrow(
      "投稿者名は1文字以上、50文字以下でなければなりません。"
    );
  });
});
