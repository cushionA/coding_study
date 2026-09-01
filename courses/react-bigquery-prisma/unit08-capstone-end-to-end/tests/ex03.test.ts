import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit08-capstone-end-to-end/ex03_search_endpoint")
  : await import("../ex03_search_endpoint");

const sampleItems = [
  { id: 1, isbn: "978-4-00-1", title: "実践TypeScript入門", author: "佐藤" },
  { id: 2, isbn: "978-4-00-2", title: "TypeScript応用ガイド", author: "鈴木" },
];

function makeRepo(items = sampleItems) {
  return { async searchByKeyword() { return items; } };
}

describe("searchBooksWithSummary", () => {
  it("Prisma検索とBigQuery集計を両方成功させ1つのレスポンスにまとめる", async () => {
    const repo = makeRepo();
    const analytics = {
      async countByAuthor() {
        return [{ author: "佐藤", count: 1 }, { author: "鈴木", count: 1 }];
      },
    };
    const res = await ex.searchBooksWithSummary(repo, analytics, "TypeScript");
    expect(res.items).toEqual(sampleItems);
    expect(res.summary).toEqual([{ author: "佐藤", count: 1 }, { author: "鈴木", count: 1 }]);
    expect(res.summaryError).toBeUndefined();
  });

  it("BigQuery集計が失敗しても一覧は返す(degrade設計)", async () => {
    const repo = makeRepo();
    const analytics = {
      async countByAuthor() {
        throw new Error("BigQueryタイムアウト");
      },
    };
    const res = await ex.searchBooksWithSummary(repo, analytics, "TypeScript");
    expect(res.items).toEqual(sampleItems);
    expect(res.summary).toBeNull();
    expect(res.summaryError).toBe("BigQueryタイムアウト");
  });

  it("Prisma検索が失敗したら例外を投げる(一覧の根拠が無いので握りつぶさない)", async () => {
    const repo = {
      async searchByKeyword() {
        throw new Error("DB接続エラー");
      },
    };
    const analytics = { async countByAuthor() { return []; } };
    await expect(
      ex.searchBooksWithSummary(repo, analytics, "TypeScript"),
    ).rejects.toThrow("DB接続エラー");
  });

  it("該当0件でもitems:[]で成功として返す(境界値)", async () => {
    const repo = makeRepo([]);
    const analytics = { async countByAuthor() { return []; } };
    const res = await ex.searchBooksWithSummary(repo, analytics, "存在しない語");
    expect(res.items).toEqual([]);
    expect(res.summary).toEqual([]);
  });
});

describe("describeSearchResponse", () => {
  it("集計成功時はkeywordと件数を含む文字列を返す", () => {
    const res = { items: sampleItems, summary: [{ author: "佐藤", count: 1 }] };
    const text = ex.describeSearchResponse("TypeScript", res);
    expect(text).toContain("TypeScript");
    expect(text).toContain("2");
  });

  it("degrade時はsummaryErrorの内容を含む文字列を返す", () => {
    const res = { items: sampleItems, summary: null, summaryError: "BigQueryタイムアウト" };
    const text = ex.describeSearchResponse("TypeScript", res);
    expect(text).toContain("BigQueryタイムアウト");
    expect(text).toContain("2");
  });
});
