import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-cheerio-basics/ex02_each_loop")
  : await import("../ex02_each_loop");

function loadLinkListHtml(): string {
  return ex.readFixture("link_list.html");
}

describe("collectNavLabels", () => {
  it("ナビリンクのテキストを出現順にすべて集める", () => {
    const result = ex.collectNavLabels(loadLinkListHtml());
    expect(result).toEqual(["トップ", "蔵書一覧", "読書会", "ブログ", "アクセス"]);
  });

  it("マッチしないHTMLなら空配列(境界値)", () => {
    const html = "<html><body><p>リンクなし</p></body></html>";
    expect(ex.collectNavLabels(html)).toEqual([]);
  });
});

describe("firstNavLabel", () => {
  it("最初のナビリンクのテキストを返す", () => {
    expect(ex.firstNavLabel(loadLinkListHtml())).toBe("トップ");
  });

  it("要素が無ければnull(境界値)", () => {
    const html = "<html><body><p>リンクなし</p></body></html>";
    expect(ex.firstNavLabel(html)).toBeNull();
  });
});

describe("navLabelAt", () => {
  it("指定インデックスのテキストを返す", () => {
    expect(ex.navLabelAt(loadLinkListHtml(), 2)).toBe("読書会");
  });

  it("範囲外のインデックスはnull(境界値)", () => {
    expect(ex.navLabelAt(loadLinkListHtml(), 99)).toBeNull();
  });
});
