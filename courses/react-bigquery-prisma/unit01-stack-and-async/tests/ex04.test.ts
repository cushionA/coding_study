import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FetchLike, BookApiResponse } from "../ex02_typed_fetch";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-stack-and-async/ex04_capstone")
  : await import("../ex04_capstone");

// url末尾の id を拾って、その id に応じたダミー書籍を返す fake fetch。
function fakeBookApiFetch(): FetchLike {
  return async (url: string) => {
    const id = Number(url.split("/").pop());
    const book: BookApiResponse = { id, title: `書籍${id}`, author: `著者${id}` };
    return new Response(JSON.stringify(book), { status: 200 });
  };
}

const ENV_KEYS = ["API_KEY", "API_BASE_URL", "API_TIMEOUT_MS"];
const originalValues = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalValues.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = originalValues.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

describe("fetchBooksConcurrently", () => {
  it("複数idを入力順のまま取得する", async () => {
    const result = await ex.fetchBooksConcurrently(fakeBookApiFetch(), [1, 2, 3]);
    expect(result).toEqual([
      { id: 1, title: "書籍1", author: "著者1" },
      { id: 2, title: "書籍2", author: "著者2" },
      { id: 3, title: "書籍3", author: "著者3" },
    ]);
  });

  it("空配列を渡すと空配列が返る(境界値)", async () => {
    const result = await ex.fetchBooksConcurrently(fakeBookApiFetch(), []);
    expect(result).toEqual([]);
  });
});

describe("loadBookCatalog", () => {
  it("設定と書籍一覧をまとめて返す", async () => {
    process.env.API_KEY = "sk-secret-abc";
    const result = await ex.loadBookCatalog(fakeBookApiFetch(), [10, 20]);
    expect(result.config).toEqual({
      baseUrl: "http://localhost:4010",
      apiKeyPresent: true,
    });
    expect(result.books).toEqual([
      { id: 10, title: "書籍10", author: "著者10" },
      { id: 20, title: "書籍20", author: "著者20" },
    ]);
  });

  it("戻り値のどこにもapiKeyそのものを含めない(秘密情報の境界)", async () => {
    process.env.API_KEY = "sk-secret-abc";
    const result = await ex.loadBookCatalog(fakeBookApiFetch(), [1]);
    expect(JSON.stringify(result)).not.toContain("sk-secret-abc");
  });

  it("API_KEY未設定ならErrorをthrowする", async () => {
    await expect(ex.loadBookCatalog(fakeBookApiFetch(), [1])).rejects.toThrow(/API_KEY/);
  });
});
