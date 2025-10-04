import { Author } from "./Author";

describe("Author", () => {
  // 正常系
  test("Authorが1文字で作成できる", () => {
    expect(new Author("山").value).toBe("山");
  });

  test("Authorが100文字で作成できる", () => {
    const longName = "山".repeat(100);
    expect(new Author(longName).value).toBe(longName);
  });

  // 異常系
  test("最小長未満の値でAuthorを生成するとエラーを投げる", () => {
    expect(() => new Author("")).toThrow(
      "著者名は1文字以上、100文字以下でなければなりません。"
    );
  });

  test("最大長を超える値でAuthorを生成するとエラーを投げる", () => {
    const tooLongName = "山".repeat(101);
    expect(() => new Author(tooLongName)).toThrow(
      "著者名は1文字以上、100文字以下でなければなりません。"
    );
  });
});
