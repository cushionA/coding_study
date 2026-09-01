import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-bigquery-client/ex01_build_schema")
  : await import("../ex01_build_schema");

describe("mapFieldType", () => {
  it.each([
    ["string", "STRING"],
    ["int", "INT64"],
    ["float", "FLOAT64"],
    ["boolean", "BOOL"],
    ["timestamp", "TIMESTAMP"],
  ] as const)("%s は %s に変換される", (input, expected) => {
    expect(ex.mapFieldType(input)).toBe(expected);
  });
});

describe("buildSchemaField", () => {
  it("nullableを指定しない場合はREQUIREDになる", () => {
    const result = ex.buildSchemaField({ name: "title", type: "string" });
    expect(result).toEqual({ name: "title", type: "STRING", mode: "REQUIRED" });
  });

  it("nullable:trueならNULLABLEになる", () => {
    const result = ex.buildSchemaField({ name: "publishYear", type: "int", nullable: true });
    expect(result).toEqual({ name: "publishYear", type: "INT64", mode: "NULLABLE" });
  });

  it("nullable:falseを明示してもREQUIREDになる(境界値)", () => {
    const result = ex.buildSchemaField({ name: "isActive", type: "boolean", nullable: false });
    expect(result).toEqual({ name: "isActive", type: "BOOL", mode: "REQUIRED" });
  });
});

describe("buildTableSchema", () => {
  it("複数のFieldSpecをまとめて変換し、順序を保つ", () => {
    const result = ex.buildTableSchema([
      { name: "id", type: "int" },
      { name: "title", type: "string" },
      { name: "ingestedAt", type: "timestamp", nullable: true },
    ]);
    expect(result).toEqual([
      { name: "id", type: "INT64", mode: "REQUIRED" },
      { name: "title", type: "STRING", mode: "REQUIRED" },
      { name: "ingestedAt", type: "TIMESTAMP", mode: "NULLABLE" },
    ]);
  });

  it("空配列を渡すと空配列が返る(境界値)", () => {
    expect(ex.buildTableSchema([])).toEqual([]);
  });
});

describe("buildAuthorSummarySchema", () => {
  it("著者別集計テーブルのスキーマを組み立てる", () => {
    const result = ex.buildAuthorSummarySchema();
    expect(result).toEqual([
      { name: "author", type: "STRING", mode: "REQUIRED" },
      { name: "bookCount", type: "INT64", mode: "REQUIRED" },
      { name: "lastIngestedAt", type: "TIMESTAMP", mode: "NULLABLE" },
    ]);
  });
});
