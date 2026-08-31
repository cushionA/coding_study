import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { createTestDb, cleanupTestDb, PrismaBetterSqlite3, type TestDb } from "./testDb";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-prisma-crud/ex02_filter_search")
  : await import("../ex02_filter_search");

let db: TestDb;
let prisma: PrismaClient;

beforeEach(async () => {
  db = createTestDb();
  const adapter = new PrismaBetterSqlite3(db.adapterOptions);
  prisma = new PrismaClient({ adapter });
  await prisma.book.create({ data: { title: "実践Prisma入門", author: "山田", rating: 3.5 } });
  await prisma.book.create({ data: { title: "実践TypeScript", author: "田中", rating: 4.8 } });
  await prisma.book.create({ data: { title: "銀河鉄道の夜", author: "宮沢賢治", rating: 4.0 } });
  await prisma.book.create({ data: { title: "こころ", author: "夏目漱石", rating: null } });
});

afterEach(async () => {
  await prisma.$disconnect();
  cleanupTestDb(db);
});

describe("searchBooksByTitle", () => {
  it("タイトルに部分一致する本だけを返す", async () => {
    const result = await ex.searchBooksByTitle(prisma, "実践");
    expect(result.map((b) => b.title).sort()).toEqual(["実践Prisma入門", "実践TypeScript"]);
  });

  it("一致するものが無ければ空配列(エッジケース)", async () => {
    expect(await ex.searchBooksByTitle(prisma, "存在しない単語")).toEqual([]);
  });
});

describe("listBooksSortedByRating", () => {
  it("降順(desc)で並ぶ", async () => {
    const result = await ex.listBooksSortedByRating(prisma, "desc");
    const withRating = result.filter((b) => b.rating !== null);
    const ratings = withRating.map((b) => b.rating);
    const sorted = [...ratings].sort((a, b) => (b as number) - (a as number));
    expect(ratings).toEqual(sorted);
  });

  it("昇順(asc)で並ぶ", async () => {
    const result = await ex.listBooksSortedByRating(prisma, "asc");
    const withRating = result.filter((b) => b.rating !== null);
    const ratings = withRating.map((b) => b.rating);
    const sorted = [...ratings].sort((a, b) => (a as number) - (b as number));
    expect(ratings).toEqual(sorted);
  });
});

describe("paginateBooks", () => {
  it("pageSize=2の1ページ目は先頭2件、totalは全件数", async () => {
    const result = await ex.paginateBooks(prisma, 1, 2);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(4);
  });

  it("2ページ目は残りの件数", async () => {
    const result = await ex.paginateBooks(prisma, 2, 2);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(4);
  });

  it("keywordを渡すと絞り込んだ上でページングされる(エッジケース)", async () => {
    const result = await ex.paginateBooks(prisma, 1, 10, "実践");
    expect(result.total).toBe(2);
    expect(result.items.map((b) => b.title).sort()).toEqual(["実践Prisma入門", "実践TypeScript"]);
  });

  it("範囲外のページはitemsが空配列でもtotalは変わらない(エッジケース)", async () => {
    const result = await ex.paginateBooks(prisma, 99, 10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(4);
  });
});
