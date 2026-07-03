import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-cheerio-basics/ex03_attributes")
  : await import("../ex03_attributes");

function loadLinkListHtml(): string {
  return ex.readFixture("link_list.html");
}

describe("collectNavHrefs", () => {
  it("ナビリンクのhrefを出現順にすべて集める", () => {
    const result = ex.collectNavHrefs(loadLinkListHtml());
    expect(result).toEqual(["/", "/books", "/event", "/blog", "/access"]);
  });
});

describe("collectSnsPlatforms", () => {
  it("data-platform属性を出現順にすべて集める", () => {
    const result = ex.collectSnsPlatforms(loadLinkListHtml());
    expect(result).toEqual(["sns-a", "feed"]);
  });

  it("属性が無い要素は'unknown'にフォールバック(境界値)", () => {
    const html = `<ul><li><a class="sns-link">リンクのみ</a></li></ul>`;
    expect(ex.collectSnsPlatforms(html)).toEqual(["unknown"]);
  });
});

describe("firstAttr", () => {
  it("最初にマッチした要素の属性値を返す", () => {
    expect(ex.firstAttr(loadLinkListHtml(), ".nav-link", "href")).toBe("/");
  });

  it("要素が見つからなければnull(境界値)", () => {
    expect(ex.firstAttr(loadLinkListHtml(), ".no-such-class", "href")).toBeNull();
  });

  it("要素はあるが属性が無ければnull(境界値)", () => {
    const html = `<a class="plain">属性なし</a>`;
    expect(ex.firstAttr(html, ".plain", "href")).toBeNull();
  });
});
