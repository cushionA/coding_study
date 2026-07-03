import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-html-and-ts-basics/ex02_array_record")
  : await import("../ex02_array_record");

describe("longWordsUpper", () => {
  it("5文字以上の要素だけ大文字化して返す", () => {
    const result = ex.longWordsUpper(["cafe", "library", "book", "reader"]);
    expect(result).toEqual(["LIBRARY", "READER"]);
  });

  it("該当する要素がなければ空配列(境界値)", () => {
    expect(ex.longWordsUpper(["a", "bb", "ccc"])).toEqual([]);
  });
});

describe("countTags", () => {
  it("タグごとの出現回数を数える", () => {
    const result = ex.countTags(["新刊", "文芸", "新刊"]);
    expect(result).toEqual({ 新刊: 2, 文芸: 1 });
  });

  it("空配列なら空のRecord(境界値)", () => {
    expect(ex.countTags([])).toEqual({});
  });
});

describe("mostCommonTag", () => {
  it("出現回数最多のタグ名を返す(デフォルトmost=1)", () => {
    const counts = { 新刊: 3, 文芸: 1, 海外文学: 1 };
    expect(ex.mostCommonTag(counts)).toBe("新刊");
  });

  it("同数の場合タグ名の昇順で順位を決める", () => {
    const counts = { 新刊: 1, 海外文学: 1 };
    expect(ex.mostCommonTag(counts, 1)).toBe("新刊");
    expect(ex.mostCommonTag(counts, 2)).toBe("海外文学");
  });
});

describe("uniqueTags", () => {
  it("出現回数1のタグ名だけを昇順で返す", () => {
    const counts = { 新刊: 2, 海外文学: 1, 文芸: 1 };
    expect(ex.uniqueTags(counts)).toEqual(["文芸", "海外文学"]);
  });
});
