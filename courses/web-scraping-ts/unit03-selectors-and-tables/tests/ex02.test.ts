import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-selectors-and-tables/ex02_table_parse")
  : await import("../ex02_table_parse");

function loadStatsHtml(): string {
  return ex.readFixture("table_stats.html");
}

describe("extractHeaders", () => {
  it("thead thのテキストを出現順に返す", () => {
    const html = loadStatsHtml();
    expect(ex.extractHeaders(html)).toEqual(["月", "来店者数", "売上冊数"]);
  });
});

describe("extractRows", () => {
  it("tbody trをtdの配列(2次元配列)として返す", () => {
    const html = loadStatsHtml();
    const result = ex.extractRows(html);
    expect(result).toEqual([
      ["4月", "320", "145"],
      ["5月", "410", "198"],
      ["6月", "380", "171"],
    ]);
  });
});

describe("zipToRecords", () => {
  it("ヘッダーと行をRecordの配列に変換する", () => {
    const headers = ["月", "来店者数"];
    const rows = [["4月", "320"], ["5月", "410"]];
    expect(ex.zipToRecords(headers, rows)).toEqual([
      { 月: "4月", 来店者数: "320" },
      { 月: "5月", 来店者数: "410" },
    ]);
  });

  it("行が0件なら空配列(境界値)", () => {
    expect(ex.zipToRecords(["月"], [])).toEqual([]);
  });
});

describe("parseStatsTable", () => {
  it("table_stats.htmlを丸ごとRecordの配列に変換する", () => {
    const html = loadStatsHtml();
    const result = ex.parseStatsTable(html);
    expect(result).toEqual([
      { 月: "4月", 来店者数: "320", 売上冊数: "145" },
      { 月: "5月", 来店者数: "410", 売上冊数: "198" },
      { 月: "6月", 来店者数: "380", 売上冊数: "171" },
    ]);
  });
});
