import { describe, it, expect, vi } from "vitest";
import type { BigQueryLike, QueryOptions } from "../ex02_param_query";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-bigquery-client/ex04_capstone")
  : await import("../ex04_capstone");

const opts: QueryOptions = { query: "SELECT * FROM `app_analytics.books`" };

function makeFakeBigQuery(
  estimatedBytes: number,
  rows: Record<string, unknown>[],
): BigQueryLike & { queryFn: ReturnType<typeof vi.fn> } {
  const queryFn = vi.fn(async () => [rows] as [typeof rows]);
  return {
    queryFn,
    query: queryFn,
    async estimateQueryBytes() {
      return estimatedBytes;
    },
    dataset() {
      return { table: () => ({ insert: async () => {} }) };
    },
  };
}

describe("runQueryWithCostGuard", () => {
  it("見積もりが上限以下なら実際にクエリを実行し、結果を返す", async () => {
    const bq = makeFakeBigQuery(500, [{ id: 1 }, { id: 2 }]);
    const result = await ex.runQueryWithCostGuard(bq, opts, 1000);
    expect(result).toEqual({ ok: true, rows: [{ id: 1 }, { id: 2 }], scannedBytes: 500 });
    expect(bq.queryFn).toHaveBeenCalledTimes(1);
  });

  it("見積もりが上限を超えるならクエリを実行せずスキップする", async () => {
    const bq = makeFakeBigQuery(5000, [{ id: 1 }]);
    const result = await ex.runQueryWithCostGuard(bq, opts, 1000);
    expect(result).toEqual({
      ok: false,
      reason: "too-expensive",
      scannedBytes: 5000,
      limitBytes: 1000,
    });
    expect(bq.queryFn).not.toHaveBeenCalled();
  });

  it("見積もりが上限とちょうど同じ場合は実行する(境界値)", async () => {
    const bq = makeFakeBigQuery(1000, [{ id: 1 }]);
    const result = await ex.runQueryWithCostGuard(bq, opts, 1000);
    expect(result.ok).toBe(true);
    expect(bq.queryFn).toHaveBeenCalledTimes(1);
  });
});

describe("describeCostGuardResult", () => {
  it("成功時はスキャン量と件数を含むメッセージを返す", () => {
    const message = ex.describeCostGuardResult({
      ok: true,
      rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      scannedBytes: 1200,
    });
    expect(message).toContain("1200");
    expect(message).toContain("3");
  });

  it("スキップ時は見積もり量と上限を含むメッセージを返す", () => {
    const message = ex.describeCostGuardResult({
      ok: false,
      reason: "too-expensive",
      scannedBytes: 5000,
      limitBytes: 1000,
    });
    expect(message).toContain("5000");
    expect(message).toContain("1000");
  });
});
