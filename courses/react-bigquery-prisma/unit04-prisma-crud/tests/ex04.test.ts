import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { createTestDb, cleanupTestDb, PrismaBetterSqlite3, type TestDb } from "./testDb";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-prisma-crud/ex04_capstone")
  : await import("../ex04_capstone");

let db: TestDb;
let prisma: PrismaClient;

beforeEach(() => {
  db = createTestDb();
  const adapter = new PrismaBetterSqlite3(db.adapterOptions);
  prisma = new PrismaClient({ adapter });
});

afterEach(async () => {
  await prisma.$disconnect();
  cleanupTestDb(db);
});

describe("ingestBooksAtomically", () => {
  it("成功時: IngestRunが1件、紐づく本が全件作られ、includeで一緒に返る", async () => {
    const result = await ex.ingestBooksAtomically(prisma, "feed-a", [
      { title: "取込本1", author: "取込著者" },
      { title: "取込本2", author: "取込著者" },
    ]);
    expect(result.source).toBe("feed-a");
    expect(result.books).toHaveLength(2);
    expect(result.books.every((b) => b.ingestRunId === result.id)).toBe(true);

    expect(await prisma.ingestRun.count()).toBe(1);
    expect(await prisma.book.count()).toBe(2);
  });

  it("空配列を渡すとIngestRunだけ作られ、booksは空配列(エッジケース)", async () => {
    const result = await ex.ingestBooksAtomically(prisma, "feed-empty", []);
    expect(result.books).toEqual([]);
    expect(await prisma.ingestRun.count()).toBe(1);
  });

  it("途中の1件が一意制約違反で失敗したら、全体がロールバックされる", async () => {
    // 事前に isbn "978-dup" を持つ本を1冊作っておく(取り込みの2件目とぶつける)
    await prisma.book.create({ data: { title: "既存本", author: "既存著者", isbn: "978-dup" } });

    const beforeRunCount = await prisma.ingestRun.count();
    const beforeBookCount = await prisma.book.count();

    let caught: unknown = null;
    try {
      await ex.ingestBooksAtomically(prisma, "feed-b", [
        { title: "新規本1", author: "新規著者" },
        { title: "重複isbn本", author: "新規著者", isbn: "978-dup" },
        { title: "新規本3", author: "新規著者" },
      ]);
    } catch (e) {
      caught = e;
    }
    // 単に「例外が飛んだ」だけでは不十分(未実装のTODOエラーでも例外は飛ぶため)。
    // 一意制約違反による失敗であることをエラーメッセージで確認する。
    expect(caught).not.toBeNull();
    const message = caught instanceof Error ? caught.message : String(caught);
    expect(message).not.toMatch(/TODO/);
    expect(message.toUpperCase()).toContain("UNIQUE");

    // ロールバックされていれば、IngestRunも新規本1件も一切増えていないはず
    expect(await prisma.ingestRun.count()).toBe(beforeRunCount);
    expect(await prisma.book.count()).toBe(beforeBookCount);
  });
});
