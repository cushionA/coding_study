import { describe, it, expect } from "vitest";
import request from "supertest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-express-api/ex02_validate_query")
  : await import("../ex02_validate_query");

describe("GET /api/books (クエリ検証)", () => {
  it("クエリなしならpage=1・pageSize=20が既定値として補われる", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 1, pageSize: 20 });
  });

  it("q・page・pageSizeを渡すと変換済みの値がそのまま返る", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books?q=type&page=2&pageSize=10");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ q: "type", page: 2, pageSize: 10 });
  });

  it("pageSizeが上限(100)を超えると400と理由を返す", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books?pageSize=1000");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid query");
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it("pageが0(最小値未満)なら400を返す(境界値)", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books?page=0");
    expect(res.status).toBe(400);
  });

  it("qが空文字なら400を返す(min(1)違反)", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books?q=");
    expect(res.status).toBe(400);
  });
});
