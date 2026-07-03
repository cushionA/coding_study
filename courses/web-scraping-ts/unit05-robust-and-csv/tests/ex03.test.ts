import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-robust-and-csv/ex03_write_csv")
  : await import("../ex03_write_csv");

describe("escapeCsvField", () => {
  it("カンマ・改行・ダブルクォートを含まない値はそのまま", () => {
    expect(ex.escapeCsvField("文芸書")).toBe("文芸書");
  });

  it("カンマを含む値はダブルクォートで囲む", () => {
    expect(ex.escapeCsvField("a,b")).toBe('"a,b"');
  });

  it("ダブルクォートを含む値は\"\"にエスケープしてから囲む", () => {
    expect(ex.escapeCsvField('5"cm')).toBe('"5""cm"');
  });

  it("改行を含む値もダブルクォートで囲む(境界値)", () => {
    expect(ex.escapeCsvField("a\nb")).toBe('"a\nb"');
  });
});

describe("recordsToCsv", () => {
  it("ヘッダ行+データ行を組み立てる", () => {
    const csv = ex.recordsToCsv([
      { name: "文芸書", price: 1200, stock: 5, date: "2026-01-01" },
    ]);
    expect(csv).toBe("name,price,stock,date\n文芸書,1200,5,2026-01-01\n");
  });

  it("レコードが0件でもヘッダ行だけのCSVになる(境界値)", () => {
    expect(ex.recordsToCsv([])).toBe("name,price,stock,date\n");
  });

  it("カンマを含む値は自動でエスケープされる", () => {
    const csv = ex.recordsToCsv([
      { name: "海辺の詩集、改訂版", price: 3600, stock: 2, date: "2026-11-09" },
    ]);
    expect(csv).toContain("海辺の詩集、改訂版,3600");
  });

  it("ダブルクォートを含む値は\"\"エスケープされ全体がクォートされる", () => {
    const csv = ex.recordsToCsv([
      { name: '名品切手集"プレミア版"', price: 720, stock: 30, date: "2026-11-10" },
    ]);
    expect(csv).toContain('"名品切手集""プレミア版""",720');
  });
});

describe("writeCsvFile", () => {
  it("一時ディレクトリにUTF-8でCSVファイルを書き出す", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ts_u05_csv_"));
    const filePath = path.join(tmpDir, "out.csv");
    ex.writeCsvFile(
      [{ name: "文芸書", price: 1200, stock: 5, date: "2026-01-01" }],
      filePath,
    );
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toBe("name,price,stock,date\n文芸書,1200,5,2026-01-01\n");
  });
});
