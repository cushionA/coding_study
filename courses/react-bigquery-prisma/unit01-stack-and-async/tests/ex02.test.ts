import { describe, it, expect } from "vitest";
import type { FetchLike, BookApiResponse } from "../ex02_typed_fetch";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-stack-and-async/ex02_typed_fetch")
  : await import("../ex02_typed_fetch");

// data 相当の値を返すダミー fetch(本物の Response オブジェクトを使う)
function fakeFetchOk<T>(data: T): FetchLike {
  return async () => new Response(JSON.stringify(data), { status: 200 });
}

function fakeFetchError(status: number): FetchLike {
  return async () => new Response(null, { status });
}

describe("isSuccessResponse", () => {
  it("200は成功と判定する", () => {
    expect(ex.isSuccessResponse(new Response(null, { status: 200 }))).toBe(true);
  });

  it("299は成功の境界内(境界値)", () => {
    expect(ex.isSuccessResponse(new Response(null, { status: 299 }))).toBe(true);
  });

  it("404は失敗と判定する", () => {
    expect(ex.isSuccessResponse(new Response(null, { status: 404 }))).toBe(false);
  });
});

describe("getStatusCategory", () => {
  it("200-299はsuccess", () => {
    expect(ex.getStatusCategory(200)).toBe("success");
  });

  it("400-499はclient-error", () => {
    expect(ex.getStatusCategory(404)).toBe("client-error");
  });

  it("500-599はserver-error", () => {
    expect(ex.getStatusCategory(503)).toBe("server-error");
  });

  it("それ以外はunknown(境界値: 100番台)", () => {
    expect(ex.getStatusCategory(101)).toBe("unknown");
  });
});

describe("fetchJson", () => {
  it("成功レスポンスのjsonを型付きで返す", async () => {
    const fetchFn = fakeFetchOk({ id: 1, title: "TypeScript入門", author: "佐藤" });
    const result = await ex.fetchJson<BookApiResponse>(fetchFn, "/api/books/1");
    expect(result).toEqual({ id: 1, title: "TypeScript入門", author: "佐藤" });
  });

  it("失敗レスポンス(404)ではErrorをthrowする", async () => {
    const fetchFn = fakeFetchError(404);
    await expect(ex.fetchJson(fetchFn, "/api/books/999")).rejects.toThrow(/404/);
  });

  it("throwするErrorのメッセージにステータスコードを含む", async () => {
    const fetchFn = fakeFetchError(500);
    await expect(ex.fetchJson(fetchFn, "/api/books/1")).rejects.toThrow(/500/);
  });
});

describe("fetchBook", () => {
  it("指定idの書籍情報を取得する", async () => {
    const fetchFn = fakeFetchOk({ id: 7, title: "非同期処理の作法", author: "鈴木" });
    const result = await ex.fetchBook(fetchFn, 7);
    expect(result).toEqual({ id: 7, title: "非同期処理の作法", author: "鈴木" });
  });

  it("失敗時はErrorをthrowする(fetchJsonの失敗が伝播する)", async () => {
    const fetchFn = fakeFetchError(404);
    await expect(ex.fetchBook(fetchFn, 999)).rejects.toThrow(/404/);
  });
});
