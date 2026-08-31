import { describe, it, expect } from "vitest";
import type { FetchLike } from "../ex03_retry_timeout";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-external-api-client/ex04_capstone")
  : await import("../ex04_capstone");

const validDtoList = [
  { book_id: 1, book_title: "本1", author_name: "  著者1  ", publish_year: 2020 },
  { book_id: 2, book_title: "本2", author_name: "著者2", publish_year: null },
];

function fakeFetchOk(body: unknown): FetchLike {
  return async () => new Response(JSON.stringify(body), { status: 200 });
}

function fakeFetchAlwaysFail(status: number): FetchLike {
  return async () => new Response(null, { status });
}

const noSleep = async () => {};

describe("fetchBooksRobustly", () => {
  it("正しいレスポンスをBook[]に変換して返す", async () => {
    const result = await ex.fetchBooksRobustly(fakeFetchOk(validDtoList), "/api/books", {
      sleepFn: noSleep,
    });
    expect(result).toEqual([
      { id: 1, title: "本1", author: "著者1", publishYear: 2020 },
      { id: 2, title: "本2", author: "著者2", publishYear: null },
    ]);
  });

  it("形が壊れたレスポンスはResponseValidationErrorをthrowする", async () => {
    const broken = [{ book_id: "1", book_title: "本1", author_name: "著者1", publish_year: null }];
    await expect(
      ex.fetchBooksRobustly(fakeFetchOk(broken), "/api/books", { sleepFn: noSleep }),
    ).rejects.toThrow(/検証/);
  });

  it("通信が最後まで失敗したらErrorをthrowする(status付き)", async () => {
    await expect(
      ex.fetchBooksRobustly(fakeFetchAlwaysFail(500), "/api/books", {
        maxAttempts: 1,
        sleepFn: noSleep,
      }),
    ).rejects.toThrow(/500/);
  });
});

describe("fetchBooksSafely", () => {
  it("成功時はok:trueとbooksを返す", async () => {
    const result = await ex.fetchBooksSafely(fakeFetchOk(validDtoList), "/api/books", {
      sleepFn: noSleep,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.books).toHaveLength(2);
    }
  });

  it("検証エラー時はreason:validationを返す(throwしない)", async () => {
    const broken = [{ book_id: "x" }];
    const result = await ex.fetchBooksSafely(fakeFetchOk(broken), "/api/books", {
      sleepFn: noSleep,
    });
    expect(result).toMatchObject({ ok: false, reason: "validation" });
  });

  it("通信エラー時はreason:networkを返す(throwしない)", async () => {
    const result = await ex.fetchBooksSafely(fakeFetchAlwaysFail(503), "/api/books", {
      maxAttempts: 1,
      sleepFn: noSleep,
    });
    expect(result).toMatchObject({ ok: false, reason: "network" });
  });
});
