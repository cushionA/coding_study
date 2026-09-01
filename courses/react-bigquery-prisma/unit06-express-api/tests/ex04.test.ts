import { describe, it, expect } from "vitest";
import request from "supertest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-express-api/ex04_capstone")
  : await import("../ex04_capstone");

const sampleBooks = [
  { id: 1, title: "TypeScript実践入門", author: "佐藤" },
  { id: 2, title: "Expressガイド", author: "鈴木" },
  { id: 3, title: "Prismaで作るアプリ", author: "田中" },
  { id: 4, title: "React入門", author: "佐藤" },
  { id: 5, title: "BigQuery分析入門", author: "山田" },
];

function buildApp() {
  const repo = new ex.FakeBookRepository(sampleBooks);
  return ex.createApp(repo);
}

describe("GET /api/books (route→service→repository)", () => {
  it("qなしなら全件をpage/pageSizeの既定値でページングして返す", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(20);
    expect(res.body.items).toEqual(sampleBooks);
  });

  it("qでtitle/authorの部分一致検索ができる(大文字小文字を無視)", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books?q=佐藤");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((b: { id: number }) => b.id).sort()).toEqual([1, 4]);
  });

  it("page/pageSizeでページングされる", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books?page=3&pageSize=2");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
    expect(res.body.items).toEqual([sampleBooks[4]]);
  });

  it("該当0件でも200でitems:[]・total:0を返す(境界値)", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books?q=存在しない著者");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0 });
  });

  it("不正なクエリは400を返す", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books?pageSize=1000");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/books/:id (route→service→repository)", () => {
  it("存在するidなら200でデータを返す", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books/3");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleBooks[2]);
  });

  it("存在しないidなら404を返す", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("999");
  });

  it("数値でないidなら400を返す", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/books/abc");
    expect(res.status).toBe(400);
  });

  it("repositoryを差し替えても同じrouteが動く(空のfake repository)", async () => {
    const app = ex.createApp(new ex.FakeBookRepository([]));
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });
});
