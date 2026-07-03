import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-cheerio-basics/ex01_query_basic")
  : await import("../ex01_query_basic");

function loadBlogHtml(): string {
  return ex.readFixture("blog_post.html");
}

describe("loadHtml", () => {
  it("cheerio.load()相当のクエリ関数を返す", () => {
    const $ = ex.loadHtml(loadBlogHtml());
    expect(typeof $).toBe("function");
    expect($("h1").text()).toBe("古書コーナー、2階に新設しました");
  });
});

describe("getText", () => {
  it("セレクタにマッチするテキストを返す", () => {
    const $ = ex.loadHtml(loadBlogHtml());
    expect(ex.getText($, ".post-title")).toBe("古書コーナー、2階に新設しました");
  });

  it("マッチしないセレクタは空文字列(境界値)", () => {
    const $ = ex.loadHtml(loadBlogHtml());
    expect(ex.getText($, ".no-such-class")).toBe("");
  });
});

describe("getPostTitle", () => {
  it("記事タイトルを取り出す", () => {
    expect(ex.getPostTitle(loadBlogHtml())).toBe("古書コーナー、2階に新設しました");
  });
});

describe("getPostMeta", () => {
  it("投稿メタ情報を取り出す", () => {
    expect(ex.getPostMeta(loadBlogHtml())).toBe("著者: 佐藤 涼太 / 投稿日: 2026-11-03");
  });
});
