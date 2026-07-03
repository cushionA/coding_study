import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-html-and-ts-basics/ex04_capstone")
  : await import("../ex04_capstone");

function loadProfileHtml(): string {
  return ex.readFixture("profile_card.html");
}

describe("parseProfile", () => {
  it("name/job/tagsを持つオブジェクトを返す", () => {
    const html = loadProfileHtml();
    const profile = ex.parseProfile(html);
    expect(profile).toEqual({
      name: "佐藤 涼太",
      job: "選書担当",
      tags: ["文芸", "海外文学", "新刊"],
    });
  });
});

describe("aggregateTagCounts", () => {
  it("複数プロフィールのタグを横断して数える", () => {
    const profiles = [
      { name: "A", job: "x", tags: ["文芸", "新刊"] },
      { name: "B", job: "y", tags: ["文芸", "海外文学"] },
    ];
    const result = ex.aggregateTagCounts(profiles);
    expect(result).toEqual({ 文芸: 2, 新刊: 1, 海外文学: 1 });
  });

  it("プロフィールが1件もなければ空のRecord(境界値)", () => {
    expect(ex.aggregateTagCounts([])).toEqual({});
  });
});

describe("formatProfileLine", () => {
  it("指定フォーマットの1行文字列を作る", () => {
    const profile = { name: "佐藤 涼太", job: "選書担当", tags: ["文芸", "海外文学", "新刊"] };
    const result = ex.formatProfileLine(profile);
    expect(result).toBe("佐藤 涼太(選書担当) - タグ: 文芸, 海外文学, 新刊");
  });
});

describe("end to end", () => {
  it("フィクスチャから読んだプロフィールでも通しで動く(統合確認)", () => {
    const html = loadProfileHtml();
    const profile = ex.parseProfile(html);
    const line = ex.formatProfileLine(profile);
    expect(line).toBe("佐藤 涼太(選書担当) - タグ: 文芸, 海外文学, 新刊");
  });
});
