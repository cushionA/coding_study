import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-cheerio-basics/ex04_capstone")
  : await import("../ex04_capstone");

function loadNestedHtml(): string {
  return ex.readFixture("nested.html");
}

describe("parseFloors", () => {
  it("フロアごとにname/sectionsを持つオブジェクトを返す", () => {
    const result = ex.parseFloors(loadNestedHtml());
    expect(result).toEqual([
      { name: "1階", sections: ["新刊コーナー", "文芸コーナー"] },
      { name: "2階", sections: ["古書コーナー"] },
    ]);
  });
});

describe("countTotalSections", () => {
  it("全フロアのセクション数を合計する", () => {
    const floors = [
      { name: "1階", sections: ["新刊コーナー", "文芸コーナー"] },
      { name: "2階", sections: ["古書コーナー"] },
    ];
    expect(ex.countTotalSections(floors)).toBe(3);
  });

  it("フロアが1件もなければ0(境界値)", () => {
    expect(ex.countTotalSections([])).toBe(0);
  });
});

describe("formatFloorLine", () => {
  it("指定フォーマットの1行文字列を作る", () => {
    const floor = { name: "1階", sections: ["新刊コーナー", "文芸コーナー"] };
    expect(ex.formatFloorLine(floor)).toBe("1階: 新刊コーナー, 文芸コーナー");
  });

  it("sectionsが空なら'(なし)'(境界値)", () => {
    const floor = { name: "3階", sections: [] as string[] };
    expect(ex.formatFloorLine(floor)).toBe("3階: (なし)");
  });
});

describe("end to end", () => {
  it("フィクスチャから読んだ結果でも通しで動く(統合確認)", () => {
    const floors = ex.parseFloors(loadNestedHtml());
    expect(ex.countTotalSections(floors)).toBe(3);
    expect(ex.formatFloorLine(floors[0])).toBe("1階: 新刊コーナー, 文芸コーナー");
  });
});
