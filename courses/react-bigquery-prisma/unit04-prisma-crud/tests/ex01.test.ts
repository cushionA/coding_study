import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { createTestDb, cleanupTestDb, PrismaBetterSqlite3, type TestDb } from "./testDb";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-prisma-crud/ex01_create_read")
  : await import("../ex01_create_read");

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

describe("createBook", () => {
  it("必須項目だけで1冊作成すると、idとcreatedAtが自動で付く", async () => {
    const created = await ex.createBook(prisma, { title: "実践Prisma", author: "山田" });
    expect(created.id).toBe(1);
    expect(created.title).toBe("実践Prisma");
    expect(created.author).toBe("山田");
    expect(created.isbn).toBeNull();
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it("isbn・ratingも渡せば、その値がそのまま保存される", async () => {
    const created = await ex.createBook(prisma, {
      title: "型で守るTypeScript",
      author: "鈴木",
      isbn: "978-4-1111",
      rating: 4.5,
    });
    expect(created.isbn).toBe("978-4-1111");
    expect(created.rating).toBe(4.5);
  });
});

describe("listAllBooks", () => {
  it("複数作成した本をid昇順で全件返す", async () => {
    await ex.createBook(prisma, { title: "本A", author: "田中" });
    await ex.createBook(prisma, { title: "本B", author: "佐藤" });
    const all = await ex.listAllBooks(prisma);
    expect(all.map((b) => b.title)).toEqual(["本A", "本B"]);
  });

  it("1件も無ければ空配列(エッジケース)", async () => {
    expect(await ex.listAllBooks(prisma)).toEqual([]);
  });
});

describe("findBookById", () => {
  it("存在するidなら、その本を返す", async () => {
    const created = await ex.createBook(prisma, { title: "本C", author: "高橋" });
    const found = await ex.findBookById(prisma, created.id);
    expect(found?.title).toBe("本C");
  });

  it("存在しないidはnull(エッジケース)", async () => {
    expect(await ex.findBookById(prisma, 9999)).toBeNull();
  });
});

describe("updateBookRating", () => {
  it("ratingだけが書き換わり、他のフィールドは変わらない", async () => {
    const created = await ex.createBook(prisma, { title: "本D", author: "伊藤" });
    const updated = await ex.updateBookRating(prisma, created.id, 3.0);
    expect(updated.rating).toBe(3.0);
    expect(updated.title).toBe("本D");
    expect(updated.author).toBe("伊藤");
  });
});

describe("deleteBook", () => {
  it("削除後はfindBookByIdで見つからなくなる", async () => {
    const created = await ex.createBook(prisma, { title: "本E", author: "渡辺" });
    const deleted = await ex.deleteBook(prisma, created.id);
    expect(deleted.id).toBe(created.id);
    expect(await ex.findBookById(prisma, created.id)).toBeNull();
  });
});
