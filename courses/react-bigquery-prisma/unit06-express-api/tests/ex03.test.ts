import { describe, it, expect } from "vitest";
import request from "supertest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-express-api/ex03_error_layering")
  : await import("../ex03_error_layering");

describe("GET /api/books/:id", () => {
  it("存在するidなら200でデータを返す", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(ex.books[0]);
  });

  it("数値でないidはValidationError経由で400を返す", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books/abc");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("abc");
  });

  it("存在しないidはNotFoundError経由で404を返す", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/books/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("999");
  });
});

describe("GET /api/boom (想定外の例外)", () => {
  it("500を返し、汎用メッセージのみでスタックトレースや機密情報を漏らさない", async () => {
    const app = ex.createApp();
    const res = await request(app).get("/api/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal server error" });
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain("hunter2");
    expect(bodyText).not.toContain("stack");
    expect(bodyText).not.toContain("exploded");
  });
});
