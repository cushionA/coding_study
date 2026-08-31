import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-prisma-schema-migrate/ex01_read_schema")
  : await import("../ex01_read_schema");

describe("extractModelNames", () => {
  it("SAMPLE_SCHEMAからBookとAuthorを出現順に取り出す", () => {
    expect(ex.extractModelNames(ex.SAMPLE_SCHEMA)).toEqual(["Book", "Author"]);
  });

  it("modelが1つだけのスキーマでも動く", () => {
    const schema = `model Tag {\n  id Int @id\n  name String\n}`;
    expect(ex.extractModelNames(schema)).toEqual(["Tag"]);
  });

  it("modelが1つもないスキーマは空配列(エッジケース)", () => {
    expect(ex.extractModelNames("datasource db {\n  provider = \"sqlite\"\n}")).toEqual([]);
  });
});

describe("extractFieldNames", () => {
  it("Bookの全フィールド名を定義順に返す", () => {
    expect(ex.extractFieldNames(ex.SAMPLE_SCHEMA, "Book")).toEqual([
      "id",
      "title",
      "author",
      "isbn",
      "rating",
      "createdAt",
    ]);
  });

  it("Authorの全フィールド名を返す", () => {
    expect(ex.extractFieldNames(ex.SAMPLE_SCHEMA, "Author")).toEqual(["id", "name", "email"]);
  });

  it("存在しないmodel名は空配列(エッジケース)", () => {
    expect(ex.extractFieldNames(ex.SAMPLE_SCHEMA, "NoSuchModel")).toEqual([]);
  });
});

describe("extractUniqueFieldNames", () => {
  it("Bookでは@uniqueが付いたisbnだけを返す", () => {
    expect(ex.extractUniqueFieldNames(ex.SAMPLE_SCHEMA, "Book")).toEqual(["isbn"]);
  });

  it("Authorでは@uniqueが付いたemailだけを返す", () => {
    expect(ex.extractUniqueFieldNames(ex.SAMPLE_SCHEMA, "Author")).toEqual(["email"]);
  });

  it("@uniqueが1つもないmodelは空配列(エッジケース)", () => {
    const schema = `model Plain {\n  id Int @id\n  memo String\n}`;
    expect(ex.extractUniqueFieldNames(schema, "Plain")).toEqual([]);
  });
});

describe("isFieldOptional", () => {
  it("isbnはString?なのでtrue", () => {
    expect(ex.isFieldOptional(ex.SAMPLE_SCHEMA, "Book", "isbn")).toBe(true);
  });

  it("titleはStringなのでfalse", () => {
    expect(ex.isFieldOptional(ex.SAMPLE_SCHEMA, "Book", "title")).toBe(false);
  });

  it("存在しないフィールド名はfalse(エッジケース)", () => {
    expect(ex.isFieldOptional(ex.SAMPLE_SCHEMA, "Book", "noSuchField")).toBe(false);
  });
});
