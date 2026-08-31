import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-prisma-schema-migrate/ex03_migrate_flow")
  : await import("../ex03_migrate_flow");

describe("extractCreatedTableNames", () => {
  it("SAMPLE_MIGRATION_SQLからBookを取り出す", () => {
    expect(ex.extractCreatedTableNames(ex.SAMPLE_MIGRATION_SQL)).toEqual(["Book"]);
  });

  it("複数テーブルのCREATE TABLEも出現順に取り出す", () => {
    const sql = `CREATE TABLE "Tag" (\n  "id" INTEGER NOT NULL\n);\nCREATE TABLE "Author" (\n  "id" INTEGER NOT NULL\n);`;
    expect(ex.extractCreatedTableNames(sql)).toEqual(["Tag", "Author"]);
  });

  it("CREATE TABLEが無ければ空配列(エッジケース)", () => {
    expect(ex.extractCreatedTableNames("CREATE INDEX \"x\" ON \"y\"(\"z\");")).toEqual([]);
  });
});

describe("extractColumnNames", () => {
  it("Bookの全カラム名を定義順に返す", () => {
    expect(ex.extractColumnNames(ex.SAMPLE_MIGRATION_SQL, "Book")).toEqual([
      "id",
      "title",
      "author",
      "isbn",
      "rating",
      "createdAt",
    ]);
  });

  it("存在しないテーブル名は空配列(エッジケース)", () => {
    expect(ex.extractColumnNames(ex.SAMPLE_MIGRATION_SQL, "NoSuchTable")).toEqual([]);
  });
});

describe("isColumnNullable", () => {
  it("idはNOT NULLなのでfalse", () => {
    expect(ex.isColumnNullable(ex.SAMPLE_MIGRATION_SQL, "Book", "id")).toBe(false);
  });

  it("isbnはNOT NULLが無いのでtrue", () => {
    expect(ex.isColumnNullable(ex.SAMPLE_MIGRATION_SQL, "Book", "isbn")).toBe(true);
  });

  it("ratingもNULL許容なのでtrue", () => {
    expect(ex.isColumnNullable(ex.SAMPLE_MIGRATION_SQL, "Book", "rating")).toBe(true);
  });

  it("存在しないカラム名はfalse(エッジケース)", () => {
    expect(ex.isColumnNullable(ex.SAMPLE_MIGRATION_SQL, "Book", "noSuchColumn")).toBe(false);
  });
});

describe("extractCreatedIndexNames", () => {
  it("SAMPLE_MIGRATION_SQLの2つのインデックス名を出現順に返す", () => {
    expect(ex.extractCreatedIndexNames(ex.SAMPLE_MIGRATION_SQL)).toEqual([
      "Book_isbn_key",
      "Book_author_idx",
    ]);
  });

  it("インデックスが無ければ空配列(エッジケース)", () => {
    expect(ex.extractCreatedIndexNames('CREATE TABLE "X" ("id" INTEGER);')).toEqual([]);
  });
});
