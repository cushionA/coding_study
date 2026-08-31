import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-external-api-client/ex02_zod_schema")
  : await import("../ex02_zod_schema");

const validDto = {
  book_id: 1,
  book_title: "実践TypeScript",
  author_name: "佐藤",
  publish_year: 2024,
};

describe("parseBookDto", () => {
  it("正しい形のデータはok:trueで返る", () => {
    const result = ex.parseBookDto(validDto);
    expect(result).toEqual({ ok: true, data: validDto });
  });

  it("publish_yearがnullでも成功する(境界値)", () => {
    const result = ex.parseBookDto({ ...validDto, publish_year: null });
    expect(result.ok).toBe(true);
  });

  it("book_idが数値でなければok:falseになる", () => {
    const result = ex.parseBookDto({ ...validDto, book_id: "1" });
    expect(result.ok).toBe(false);
  });

  it("book_titleが空文字ならok:falseになる", () => {
    const result = ex.parseBookDto({ ...validDto, book_title: "" });
    expect(result.ok).toBe(false);
  });

  it("必須フィールドが欠けているとok:falseになる", () => {
    const { author_name, ...broken } = validDto;
    const result = ex.parseBookDto(broken);
    expect(result.ok).toBe(false);
  });
});

describe("parseBookDtoList", () => {
  it("正しい形の配列はok:trueでそのまま返る", () => {
    const result = ex.parseBookDtoList([validDto, { ...validDto, book_id: 2 }]);
    expect(result).toEqual({ ok: true, data: [validDto, { ...validDto, book_id: 2 }] });
  });

  it("空配列は成功として扱う(境界値)", () => {
    const result = ex.parseBookDtoList([]);
    expect(result).toEqual({ ok: true, data: [] });
  });

  it("1件でも壊れたデータが混じっていれば全体がok:falseになる", () => {
    const result = ex.parseBookDtoList([validDto, { ...validDto, book_id: "2" }]);
    expect(result.ok).toBe(false);
  });

  it("配列でないデータを渡すとok:falseになる", () => {
    const result = ex.parseBookDtoList(validDto);
    expect(result.ok).toBe(false);
  });
});
