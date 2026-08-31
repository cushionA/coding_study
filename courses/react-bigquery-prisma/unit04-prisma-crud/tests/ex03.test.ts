import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { createTestDb, cleanupTestDb, PrismaBetterSqlite3, type TestDb } from "./testDb";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-prisma-crud/ex03_upsert_relations")
  : await import("../ex03_upsert_relations");

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

describe("upsertBookByIsbn", () => {
  it("初回はcreateされる", async () => {
    const result = await ex.upsertBookByIsbn(prisma, {
      isbn: "978-1", title: "初版タイトル", author: "山田", rating: 3.0,
    });
    expect(result.title).toBe("初版タイトル");
    expect(await prisma.book.count()).toBe(1);
  });

  it("同じisbnで2回目を呼んでも行が増えず、内容だけ更新される(冪等性)", async () => {
    await ex.upsertBookByIsbn(prisma, { isbn: "978-1", title: "初版タイトル", author: "山田" });
    const second = await ex.upsertBookByIsbn(prisma, {
      isbn: "978-1", title: "改訂版タイトル", author: "山田", rating: 4.2,
    });
    expect(second.title).toBe("改訂版タイトル");
    expect(second.rating).toBe(4.2);
    expect(await prisma.book.count()).toBe(1);
  });

  it("違うisbnなら別の行として作られる(エッジケース)", async () => {
    await ex.upsertBookByIsbn(prisma, { isbn: "978-1", title: "本A", author: "田中" });
    await ex.upsertBookByIsbn(prisma, { isbn: "978-2", title: "本B", author: "田中" });
    expect(await prisma.book.count()).toBe(2);
  });
});

describe("addTagToBook / getBookWithTags", () => {
  it("タグを追加すると、戻り値にそのタグが含まれる", async () => {
    const book = await prisma.book.create({ data: { title: "本X", author: "佐藤" } });
    const result = await ex.addTagToBook(prisma, book.id, "sci-fi");
    expect(result.tags.map((t) => t.label)).toEqual(["sci-fi"]);
  });

  it("複数回タグを追加すると、両方が含まれる", async () => {
    const book = await prisma.book.create({ data: { title: "本Y", author: "佐藤" } });
    await ex.addTagToBook(prisma, book.id, "sci-fi");
    const result = await ex.addTagToBook(prisma, book.id, "bestseller");
    expect(result.tags.map((t) => t.label).sort()).toEqual(["bestseller", "sci-fi"]);
  });

  it("getBookWithTagsでタグ込みの本を取得できる", async () => {
    const book = await prisma.book.create({ data: { title: "本Z", author: "佐藤" } });
    await ex.addTagToBook(prisma, book.id, "must-read");
    const found = await ex.getBookWithTags(prisma, book.id);
    expect(found?.tags.map((t) => t.label)).toEqual(["must-read"]);
  });

  it("存在しないbookIdはnull(エッジケース)", async () => {
    expect(await ex.getBookWithTags(prisma, 9999)).toBeNull();
  });

  it("タグが1つも無い本はtagsが空配列(エッジケース)", async () => {
    const book = await prisma.book.create({ data: { title: "タグ無し本", author: "佐藤" } });
    const found = await ex.getBookWithTags(prisma, book.id);
    expect(found?.tags).toEqual([]);
  });
});
