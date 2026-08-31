import { describe, it, expect } from "vitest";
import type { FieldDef } from "../ex02_write_model";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-prisma-schema-migrate/ex02_write_model")
  : await import("../ex02_write_model");

describe("buildFieldLine", () => {
  it("属性なし・必須フィールド", () => {
    const field: FieldDef = { name: "title", type: "String" };
    expect(ex.buildFieldLine(field)).toBe("  title String");
  });

  it("属性なし・null許容フィールド", () => {
    const field: FieldDef = { name: "rating", type: "Float", optional: true };
    expect(ex.buildFieldLine(field)).toBe("  rating Float?");
  });

  it("属性が複数ある必須フィールド", () => {
    const field: FieldDef = {
      name: "id",
      type: "Int",
      attributes: ["@id", "@default(autoincrement())"],
    };
    expect(ex.buildFieldLine(field)).toBe("  id Int @id @default(autoincrement())");
  });

  it("null許容+属性ありフィールド(エッジケース: ?と属性の両方)", () => {
    const field: FieldDef = { name: "isbn", type: "String", optional: true, attributes: ["@unique"] };
    expect(ex.buildFieldLine(field)).toBe("  isbn String? @unique");
  });

  it("attributesが空配列のときは属性部分を付けない(エッジケース)", () => {
    const field: FieldDef = { name: "memo", type: "String", attributes: [] };
    expect(ex.buildFieldLine(field)).toBe("  memo String");
  });
});

describe("buildModelBlock", () => {
  it("複数フィールドからmodelブロック全体を組み立てる", () => {
    const fields: FieldDef[] = [
      { name: "id", type: "Int", attributes: ["@id", "@default(autoincrement())"] },
      { name: "title", type: "String" },
      { name: "isbn", type: "String", optional: true, attributes: ["@unique"] },
    ];
    const expected = [
      "model Book {",
      "  id Int @id @default(autoincrement())",
      "  title String",
      "  isbn String? @unique",
      "}",
    ].join("\n");
    expect(ex.buildModelBlock("Book", fields)).toBe(expected);
  });

  it("フィールドが1つだけでも正しく組み立つ(エッジケース)", () => {
    const fields: FieldDef[] = [{ name: "name", type: "String" }];
    const expected = ["model Tag {", "  name String", "}"].join("\n");
    expect(ex.buildModelBlock("Tag", fields)).toBe(expected);
  });
});

describe("buildIndexLine", () => {
  it("フィールド1つの@@indexを組み立てる", () => {
    expect(ex.buildIndexLine(["author"])).toBe("  @@index([author])");
  });

  it("フィールド複数の@@indexを組み立てる", () => {
    expect(ex.buildIndexLine(["author", "title"])).toBe("  @@index([author, title])");
  });
});
