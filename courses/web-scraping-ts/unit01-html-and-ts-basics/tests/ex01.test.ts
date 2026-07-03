import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-html-and-ts-basics/ex01_string_extract")
  : await import("../ex01_string_extract");

describe("cleanWhitespace", () => {
  it("前後の空白・改行を取り除く", () => {
    expect(ex.cleanWhitespace("  こんにちは  \n")).toBe("こんにちは");
  });

  it("前後に何もない文字列はそのまま返る(境界値)", () => {
    expect(ex.cleanWhitespace("そのまま")).toBe("そのまま");
  });
});

describe("splitTags", () => {
  it("カンマ区切りを前後空白なしの配列にする", () => {
    expect(ex.splitTags("文芸, 海外文学, 新刊")).toEqual(["文芸", "海外文学", "新刊"]);
  });

  it("要素が1つだけでも動く(境界値)", () => {
    expect(ex.splitTags("文芸")).toEqual(["文芸"]);
  });
});

describe("extractValue", () => {
  it("最初のコロンの後ろの値を前後空白なしで返す", () => {
    expect(ex.extractValue("営業時間: 10:00-20:00")).toBe("10:00-20:00");
  });

  it("値部分にコロンが複数あっても壊れない", () => {
    expect(ex.extractValue("受付: 10:30")).toBe("10:30");
  });
});

describe("formatSummary", () => {
  it("指定フォーマットの文字列を組み立てる", () => {
    expect(ex.formatSummary("佐藤 涼太", "選書担当")).toBe("名前: 佐藤 涼太 / 職業: 選書担当");
  });
});
