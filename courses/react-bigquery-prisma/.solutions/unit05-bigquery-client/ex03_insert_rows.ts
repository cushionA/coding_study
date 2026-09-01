// ex03_insert_rows: table.insert()で行を投入し、部分失敗を検知してログに残す
// RDBへのINSERTと違い、BigQueryのストリーミング挿入(table.insert())は
// 複数行をまとめて送ったとき「一部の行だけ失敗する」ことがある
// (例: 1000行中3行だけスキーマ違反で拒否される)。これはトランザクション的な
// 「全部成功 or 全部失敗」とは違う挙動なので、明示的に検知してログに残す必要がある。
// 実際の @google-cloud/bigquery ではこれを PartialFailureError としてthrowしてくる。

import type { BigQueryLike } from "./ex02_param_query";

// 失敗した行1件分の情報。実際のPartialFailureErrorの`.errors`に近い形。
export type InsertRowError = {
  row: Record<string, unknown>;
  reasons: string[];
};

// 一部の行が失敗したことを表す専用の例外クラス。
// (このユニットのfakeなBigQueryLike実装が、insert失敗時にthrowする想定の型)
export class PartialFailureError extends Error {
  readonly insertErrors: InsertRowError[];
  constructor(insertErrors: InsertRowError[]) {
    super(`BigQueryへの行挿入で${insertErrors.length}件が失敗しました`);
    this.name = "PartialFailureError";
    this.insertErrors = insertErrors;
  }
}

// 指定したdataset/tableに行を挿入する、最も素朴な形。
export async function insertRows(
  bq: BigQueryLike,
  datasetId: string,
  tableId: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  await bq.dataset(datasetId).table(tableId).insert(rows);
}

// 挿入結果を表す判別共用体。呼び出し側がtry/catchを書かずに
// 「全部成功したか」「何件失敗したか」を判定できるようにする。
export type InsertLogResult =
  | { ok: true; insertedCount: number }
  | { ok: false; insertedCount: number; failedCount: number; failures: InsertRowError[] };

// insertRowsを実行し、PartialFailureErrorを検知してログ用の結果に変換する。
// 一部失敗しても例外は外に投げず、呼び出し側がログに残せる形で返す。
export async function insertRowsWithLog(
  bq: BigQueryLike,
  datasetId: string,
  tableId: string,
  rows: Record<string, unknown>[],
): Promise<InsertLogResult> {
  try {
    await insertRows(bq, datasetId, tableId, rows);
    return { ok: true, insertedCount: rows.length };
  } catch (error) {
    if (error instanceof PartialFailureError) {
      const failedCount = error.insertErrors.length;
      return {
        ok: false,
        insertedCount: rows.length - failedCount,
        failedCount,
        failures: error.insertErrors,
      };
    }
    throw error;
  }
}
