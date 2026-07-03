import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-selectors-and-tables/ex04_capstone")
  : await import("../ex04_capstone");

function loadProductsHtml(): string {
  return ex.readFixture("products.html");
}

describe("parseProducts", () => {
  it("在庫あり/なし含め5件すべてをProduct配列に変換する", () => {
    const html = loadProductsHtml();
    const result = ex.parseProducts(html);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ name: "星めぐりの記憶", price: 1800, inStock: true });
    expect(result[1]).toEqual({ name: "古書修繕の手引き", price: 2400, inStock: false });
  });
});

describe("inStockSortedByPrice", () => {
  it("在庫ありだけを価格の安い順に並べる", () => {
    const products = [
      { name: "A", price: 1800, inStock: true },
      { name: "B", price: 2400, inStock: false },
      { name: "C", price: 1500, inStock: true },
      { name: "D", price: 2200, inStock: true },
    ];
    const result = ex.inStockSortedByPrice(products);
    expect(result.map((p) => p.name)).toEqual(["C", "A", "D"]);
  });

  it("在庫ありが1件もなければ空配列(境界値)", () => {
    const products = [{ name: "A", price: 1000, inStock: false }];
    expect(ex.inStockSortedByPrice(products)).toEqual([]);
  });
});

describe("priceSummary", () => {
  it("合計と平均(四捨五入)を返す", () => {
    const products = [
      { name: "A", price: 1500, inStock: true },
      { name: "B", price: 1800, inStock: true },
      { name: "C", price: 2200, inStock: true },
    ];
    expect(ex.priceSummary(products)).toEqual({ total: 5500, average: 1833 });
  });

  it("0件なら total:0, average:0(境界値)", () => {
    expect(ex.priceSummary([])).toEqual({ total: 0, average: 0 });
  });
});

describe("end to end", () => {
  it("products.htmlから在庫ありの合計・平均を通しで計算する(統合確認)", () => {
    const html = loadProductsHtml();
    const products = ex.parseProducts(html);
    const inStock = ex.inStockSortedByPrice(products);
    const summary = ex.priceSummary(inStock);
    expect(summary).toEqual({ total: 5500, average: 1833 });
  });
});
