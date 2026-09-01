import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit08-capstone-end-to-end/ex02_ingest_dual_write")
  : await import("../ex02_ingest_dual_write");

type BookInput = { isbn: string; title: string; author: string; publishedYear: number | null };
type AnalyticsBookRow = { isbn: string; title: string; author: string; batchId: string; ingestedAt: string };

function makeFakeRepo() {
  const store = new Map<string, BookInput>();
  return {
    store,
    async upsertByIsbn(book: BookInput) {
      store.set(book.isbn, book);
    },
  };
}

function makeFakeAnalytics(insertImpl?: (row: AnalyticsBookRow) => Promise<void>) {
  const rows: AnalyticsBookRow[] = [];
  return {
    rows,
    async insertBookRow(row: AnalyticsBookRow) {
      if (insertImpl) {
        await insertImpl(row);
        return;
      }
      rows.push(row);
    },
  };
}

const dtos = [
  { isbn: "978-4-00-1", title: "吾輩は猫である", author_name: "夏目漱石", first_publish_year: 1905 },
  { isbn: "978-4-00-2", title: "坊っちゃん", author_name: "夏目漱石", first_publish_year: 1906 },
];
const fetchSourceBooks = async () => dtos;
const now = () => "2026-01-01T00:00:00Z";

describe("toBookInput", () => {
  it("author_name→author、first_publish_year→publishedYearにリネームする", () => {
    const input = ex.toBookInput(dtos[0]);
    expect(input).toEqual({
      isbn: "978-4-00-1",
      title: "吾輩は猫である",
      author: "夏目漱石",
      publishedYear: 1905,
    });
  });
});

describe("ingestBooks", () => {
  it("外部データをPrisma風リポジトリに保存し、BigQuery風にも書き込む", async () => {
    const repo = makeFakeRepo();
    const analytics = makeFakeAnalytics();
    const summary = await ex.ingestBooks(fetchSourceBooks, repo, analytics, "batch-1", now);

    expect(summary).toEqual({ batchId: "batch-1", ingestedCount: 2, analyticsFailures: [] });
    expect(repo.store.size).toBe(2);
    expect(analytics.rows).toEqual([
      { isbn: "978-4-00-1", title: "吾輩は猫である", author: "夏目漱石", batchId: "batch-1", ingestedAt: "2026-01-01T00:00:00Z" },
      { isbn: "978-4-00-2", title: "坊っちゃん", author: "夏目漱石", batchId: "batch-1", ingestedAt: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("同じデータを2回取り込んでも正ストアの件数は増えない(冪等性)", async () => {
    const repo = makeFakeRepo();
    const analytics = makeFakeAnalytics();
    await ex.ingestBooks(fetchSourceBooks, repo, analytics, "batch-1", now);
    await ex.ingestBooks(fetchSourceBooks, repo, analytics, "batch-2", now);
    expect(repo.store.size).toBe(2);
  });

  it("BigQuery側が失敗しても取り込み自体は成功扱いにし、失敗を記録する", async () => {
    const repo = makeFakeRepo();
    const analytics = makeFakeAnalytics(async () => {
      throw new Error("BigQuery接続エラー");
    });
    const summary = await ex.ingestBooks(fetchSourceBooks, repo, analytics, "batch-1", now);

    expect(summary.ingestedCount).toBe(2);
    expect(summary.analyticsFailures).toEqual([
      { isbn: "978-4-00-1", reason: "BigQuery接続エラー" },
      { isbn: "978-4-00-2", reason: "BigQuery接続エラー" },
    ]);
    expect(repo.store.size).toBe(2);
  });

  it("Prisma側の保存が失敗したら例外を投げる(正データが壊れる操作は握りつぶさない)", async () => {
    const repo = {
      async upsertByIsbn() {
        throw new Error("DB接続エラー");
      },
    };
    const analytics = makeFakeAnalytics();
    await expect(
      ex.ingestBooks(fetchSourceBooks, repo, analytics, "batch-1", now),
    ).rejects.toThrow("DB接続エラー");
  });
});
