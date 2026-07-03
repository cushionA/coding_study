import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-robust-and-csv/ex04_capstone")
  : await import("../ex04_capstone");

function loadDirtyHtml(): string {
  return ex.readFixture("dirty_records.html");
}

function loadExpectedCsv(): string {
  return ex.readFixture("expected_output.csv");
}

describe("extractRawRecords", () => {
  it("フィクスチャの行数(7行)ぶんRawRecordを取り出す", () => {
    const records = ex.extractRawRecords(loadDirtyHtml());
    expect(records).toHaveLength(7);
  });

  it("1件目は未クレンジングの生テキストを保持する(境界値: まだ整形前)", () => {
    const records = ex.extractRawRecords(loadDirtyHtml());
    expect(records[0].price).toBe("¥1,200");
  });
});

describe("buildCsvFromDirtyHtml", () => {
  it("dirty_records.htmlからexpected_output.csvと一致するCSVを生成する", () => {
    const csv = ex.buildCsvFromDirtyHtml(loadDirtyHtml());
    expect(csv).toBe(loadExpectedCsv());
  });

  it("価格未定・在庫欠損・名前欠損の3行はスキップされる(境界値)", () => {
    const csv = ex.buildCsvFromDirtyHtml(loadDirtyHtml());
    const lines = csv.trim().split("\n");
    // ヘッダ1行 + 正常4行 = 5行
    expect(lines).toHaveLength(5);
  });
});
