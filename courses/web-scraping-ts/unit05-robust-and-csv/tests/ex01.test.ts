import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-robust-and-csv/ex01_clean_fields")
  : await import("../ex01_clean_fields");

describe("cleanText", () => {
  it("前後の半角空白を取り除く", () => {
    expect(ex.cleanText("  古書探偵の憂鬱  ")).toBe("古書探偵の憂鬱");
  });

  it("前後の全角空白も取り除く", () => {
    expect(ex.cleanText("　星屑の図書館　")).toBe("星屑の図書館");
  });

  it("前後に何もなければそのまま返る(境界値)", () => {
    expect(ex.cleanText("そのまま")).toBe("そのまま");
  });
});

describe("parsePriceYen", () => {
  it("¥とカンマを除去して数値化する", () => {
    expect(ex.parsePriceYen("¥1,200")).toBe(1200);
  });

  it("全角￥記号と全角空白混じりでも数値化する", () => {
    expect(ex.parsePriceYen("￥　2,480")).toBe(2480);
  });

  it("末尾「円」表記も数値化する", () => {
    expect(ex.parsePriceYen("3,600円")).toBe(3600);
  });

  it("数値化できない文字列はNaNを返す(境界値)", () => {
    expect(Number.isNaN(ex.parsePriceYen("価格未定"))).toBe(true);
  });
});

describe("parseStock", () => {
  it("前後空白付きの数字を整数化する", () => {
    expect(ex.parseStock(" 4 ")).toBe(4);
  });

  it("数値でない文字列はNaNを返す(境界値)", () => {
    expect(Number.isNaN(ex.parseStock("-"))).toBe(true);
  });
});

describe("normalizeDate", () => {
  it("スラッシュ区切り・1桁日付をゼロ埋めしてISO形式にする", () => {
    expect(ex.normalizeDate("2026/11/3")).toBe("2026-11-03");
  });

  it("ハイフン区切りはそのままISO形式になる", () => {
    expect(ex.normalizeDate("2026-11-05")).toBe("2026-11-05");
  });

  it("ドット区切りもISO形式に正規化する", () => {
    expect(ex.normalizeDate("2026.11.09")).toBe("2026-11-09");
  });
});
