import { describe, it, expect } from "vitest";
import type { BigQueryLike } from "../ex02_param_query";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-bigquery-client/ex03_insert_rows")
  : await import("../ex03_insert_rows");

// insertの挙動を差し替えられる、fakeなBigQueryLike。
// datasetId/tableIdをそのまま記録しておき、テストで検証に使う。
function makeFakeBigQuery(
  insertImpl: (rows: Record<string, unknown>[]) => Promise<void>,
): BigQueryLike & { calledWith: { datasetId: string; tableId: string }[] } {
  const calledWith: { datasetId: string; tableId: string }[] = [];
  return {
    calledWith,
    async query() {
      return [[]];
    },
    async estimateQueryBytes() {
      return 0;
    },
    dataset(datasetId: string) {
      return {
        table(tableId: string) {
          calledWith.push({ datasetId, tableId });
          return { insert: insertImpl };
        },
      };
    },
  };
}

describe("insertRows", () => {
  it("dataset(id).table(id).insert(rows)を正しい引数で呼ぶ", async () => {
    let received: Record<string, unknown>[] | null = null;
    const bq = makeFakeBigQuery(async (rows) => {
      received = rows;
    });
    const rows = [{ id: 1, title: "本1" }];
    await ex.insertRows(bq, "app_analytics", "books", rows);
    expect(bq.calledWith).toEqual([{ datasetId: "app_analytics", tableId: "books" }]);
    expect(received).toEqual(rows);
  });
});

describe("insertRowsWithLog", () => {
  it("全件成功した場合はok:trueとinsertedCountを返す", async () => {
    const bq = makeFakeBigQuery(async () => {});
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = await ex.insertRowsWithLog(bq, "app_analytics", "books", rows);
    expect(result).toEqual({ ok: true, insertedCount: 3 });
  });

  it("PartialFailureErrorを検知し、失敗件数とfailuresをログに残す", async () => {
    const failure = { row: { id: 2 }, reasons: ["型が違います"] };
    const bq = makeFakeBigQuery(async () => {
      throw new ex.PartialFailureError([failure]);
    });
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = await ex.insertRowsWithLog(bq, "app_analytics", "books", rows);
    expect(result).toEqual({
      ok: false,
      insertedCount: 2,
      failedCount: 1,
      failures: [failure],
    });
  });

  it("PartialFailureError以外のエラーはそのままthrowする(握りつぶさない)", async () => {
    const bq = makeFakeBigQuery(async () => {
      throw new Error("ネットワーク切断");
    });
    await expect(
      ex.insertRowsWithLog(bq, "app_analytics", "books", [{ id: 1 }]),
    ).rejects.toThrow("ネットワーク切断");
  });
});
