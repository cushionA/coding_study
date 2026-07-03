import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-selectors-and-tables/ex01_css_select")
  : await import("../ex01_css_select");

function loadProductsHtml(): string {
  return ex.readFixture("products.html");
}

describe("extractProductNames", () => {
  it("div.item > span.name のテキストを出現順にすべて集める", () => {
    const html = loadProductsHtml();
    const result = ex.extractProductNames(html);
    expect(result).toEqual([
      "星めぐりの記憶",
      "古書修繕の手引き",
      "海辺の図書館",
      "活版印刷のはなし",
      "夜行バスの読書灯",
    ]);
  });

  it("該当要素がなければ空配列(境界値)", () => {
    const html = "<html><body><div class='other'><span class='name'>x</span></div></body></html>";
    expect(ex.extractProductNames(html)).toEqual([]);
  });
});

describe("extractInStockNames", () => {
  it("data-stock=\"in\"の商品名だけを抽出する", () => {
    const html = loadProductsHtml();
    const result = ex.extractInStockNames(html);
    expect(result).toEqual(["星めぐりの記憶", "海辺の図書館", "活版印刷のはなし"]);
  });
});

describe("extractTagLabels", () => {
  it("a.tagのテキストをすべて集める", () => {
    const html = loadProductsHtml();
    const result = ex.extractTagLabels(html);
    expect(result).toEqual(["文芸", "エッセイ", "工芸"]);
  });
});
