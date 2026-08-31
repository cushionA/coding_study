import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-prisma-schema-migrate/ex04_capstone")
  : await import("../ex04_capstone");

// 本ユニットの prisma/migrations/ にある実際の migration.sql と同じ内容。
// (テストごとに使い捨てのSQLiteファイルへ直接流し込むことで、CLIを起動せず
//  高速・決定的に「マイグレーション後の状態」を再現する)
const CREATE_TABLE_SQL = `
CREATE TABLE "Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

let tmpDir: string;
let dbFilePath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unit03-ex04-"));
  dbFilePath = path.join(tmpDir, "app.db");
  const rawDb = new Database(dbFilePath);
  rawDb.exec(CREATE_TABLE_SQL);
  rawDb.close();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("createPrismaClient", () => {
  it("PrismaClientのインスタンスを作れる($disconnectを持つ)", () => {
    const prisma = ex.createPrismaClient(dbFilePath);
    expect(typeof prisma.$disconnect).toBe("function");
  });
});

describe("createBook / listBooksByAuthor", () => {
  it("1冊作成すると、id付きの行が返る", async () => {
    const prisma = ex.createPrismaClient(dbFilePath);
    const created = await ex.createBook(prisma, { title: "実践Prisma", author: "山田" });
    expect(created.id).toBe(1);
    expect(created.title).toBe("実践Prisma");
    expect(created.author).toBe("山田");
    await prisma.$disconnect();
  });

  it("同じ著者の本だけを検索できる", async () => {
    const prisma = ex.createPrismaClient(dbFilePath);
    await ex.createBook(prisma, { title: "本A", author: "田中" });
    await ex.createBook(prisma, { title: "本B", author: "田中" });
    await ex.createBook(prisma, { title: "本C", author: "鈴木" });

    const tanaka = await ex.listBooksByAuthor(prisma, "田中");
    expect(tanaka).toHaveLength(2);
    expect(tanaka.map((b) => b.title).sort()).toEqual(["本A", "本B"]);
    await prisma.$disconnect();
  });

  it("該当する著者がいなければ空配列(エッジケース)", async () => {
    const prisma = ex.createPrismaClient(dbFilePath);
    const result = await ex.listBooksByAuthor(prisma, "誰でもない人");
    expect(result).toEqual([]);
    await prisma.$disconnect();
  });
});
