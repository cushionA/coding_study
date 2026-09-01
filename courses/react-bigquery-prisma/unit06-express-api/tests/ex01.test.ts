import { describe, it, expect } from "vitest";
import request from "supertest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-express-api/ex01_first_route")
  : await import("../ex01_first_route");

describe("GET /api/books", () => {
  it("一覧を200・JSON配列で返す", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(ex.books.length);
  });

  it("配列の各要素がid/title/authorを持つ(内容が一致する)", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books");
    expect(res.body[0]).toEqual(ex.books[0]);
    expect(res.body[2]).toEqual(ex.books[2]);
  });
});

describe("GET /api/books/:id", () => {
  it("存在するidなら該当データを200で返す", async () => {
    const app = ex.createApp();
    const target = ex.books[1];
    const res = await request(app).get(`/api/books/${target.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(target);
  });

  it("存在しないidなら404とエラーメッセージを返す", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books/9999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "book not found" });
  });

  it("数値でないidを渡してもクラッシュせず404で返す(境界値)", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books/abc");
    expect(res.status).toBe(404);
  });
});
