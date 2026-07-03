import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-html-and-ts-basics/ex03_html_skim")
  : await import("../ex03_html_skim");

function loadSimplePage(): string {
  return ex.readFixture("simple_page.html");
}

describe("extractBetween", () => {
  it("タグに挟まれた最初のテキストを取り出す", () => {
    const html = loadSimplePage();
    expect(ex.extractBetween(html, "<h1>", "</h1>")).toBe("本の森書店");
  });

  it("見つからないタグを渡すとnull(境界値)", () => {
    const html = loadSimplePage();
    expect(ex.extractBetween(html, "<h3>", "</h3>")).toBeNull();
  });
});

describe("extractHrefList", () => {
  it("hrefの値を出現順にすべて集める", () => {
    const html = loadSimplePage();
    expect(ex.extractHrefList(html)).toEqual(["/books", "/event", "/access"]);
  });

  it("aタグがなければ空配列(境界値)", () => {
    const html = "<html><body><p>リンクなし</p></body></html>";
    expect(ex.extractHrefList(html)).toEqual([]);
  });
});

describe("extractParagraphs", () => {
  it("<p>...</p>のテキストを出現順にすべて集める", () => {
    const html = loadSimplePage();
    const result = ex.extractParagraphs(html);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe("営業時間: 10:00-20:00 / 定休日: 火曜");
    expect(result[3]).toBe("お問い合わせ: info@example-bookstore.test");
  });
});
