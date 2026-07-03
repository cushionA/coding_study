import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-capstone-scraper/ex01_collect_links")
  : await import("../ex01_collect_links");

describe("extractItemLinks", () => {
  it("1ページ目の4件のURLをBASE_URL付きで返す", async () => {
    const html = await ex.fetchLocal(ex.BASE_URL + "list_page_1.html");
    const links = ex.extractItemLinks(html);
    expect(links).toEqual([
      ex.BASE_URL + "item_1.html",
      ex.BASE_URL + "item_2.html",
      ex.BASE_URL + "item_3.html",
      ex.BASE_URL + "item_4.html",
    ]);
  });

  it("3ページ目の2件(端数ページ)も正しく返す(エッジケース)", async () => {
    const html = await ex.fetchLocal(ex.BASE_URL + "list_page_3.html");
    const links = ex.extractItemLinks(html);
    expect(links).toEqual([
      ex.BASE_URL + "item_9.html",
      ex.BASE_URL + "item_10.html",
    ]);
  });
});

describe("extractNextPageUrl", () => {
  it("次ページがあればURLを返す", async () => {
    const html = await ex.fetchLocal(ex.BASE_URL + "list_page_1.html");
    expect(ex.extractNextPageUrl(html)).toBe(ex.BASE_URL + "list_page_2.html");
  });

  it("最終ページ(次ページなし)でnullを返す(境界値)", async () => {
    const html = await ex.fetchLocal(ex.BASE_URL + "list_page_3.html");
    expect(ex.extractNextPageUrl(html)).toBeNull();
  });
});

describe("collectAllItemLinks", () => {
  it("3ページ分を辿って10件を順序通りに集める(統合確認)", async () => {
    const links = await ex.collectAllItemLinks(ex.BASE_URL + "list_page_1.html");
    expect(links).toHaveLength(10);
    expect(links[0]).toBe(ex.BASE_URL + "item_1.html");
    expect(links[9]).toBe(ex.BASE_URL + "item_10.html");
  });
});
