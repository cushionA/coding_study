// ex04_capstone: dryRunでコストを見積もってから実際にクエリを実行する
// BigQueryの課金は「スキャンしたバイト数」で決まる(SELECT *は高価、LIMITを
// 付けてもスキャン量自体は減らないので安くならない、という直感に反する仕様)。
// だから実務では、本実行の前にdryRun(実際には実行せず統計だけ返すオプション)で
// 見積もり、閾値を超えたら実行しない、というコストガードを入れるのが定石。
// このユニットのBigQueryLikeでは、dryRun相当を `estimateQueryBytes` という
// 別メソッドに切り出している(実際のAPIは`createQueryJob({ dryRun: true })`の
// 戻り値の `job.metadata.statistics.query.totalBytesProcessed` を読む形の簡略化)。

import type { BigQueryLike, QueryOptions, QueryRows } from "./ex02_param_query";

export type CostGuardResult =
  | { ok: true; rows: QueryRows; scannedBytes: number }
  | { ok: false; reason: "too-expensive"; scannedBytes: number; limitBytes: number };

// optsのクエリを実行する前にdryRunでスキャン量を見積もり、
// maxBytesを超えるなら実行せずに ok:false を返す。
// 超えなければ実際にクエリを実行し、結果とスキャン量を返す。
export async function runQueryWithCostGuard(
  bq: BigQueryLike,
  opts: QueryOptions,
  maxBytes: number,
): Promise<CostGuardResult> {
  const scannedBytes = await bq.estimateQueryBytes(opts);
  if (scannedBytes > maxBytes) {
    return { ok: false, reason: "too-expensive", scannedBytes, limitBytes: maxBytes };
  }
  const [rows] = await bq.query(opts);
  return { ok: true, rows, scannedBytes };
}

// ログ出力用に1行のメッセージへ整形する。呼び出し側でconsole.logする想定。
export function describeCostGuardResult(result: CostGuardResult): string {
  if (result.ok) {
    return `実行OK: ${result.scannedBytes}バイトスキャン、${result.rows.length}行取得`;
  }
  return `実行スキップ: 見積もり${result.scannedBytes}バイト > 上限${result.limitBytes}バイト`;
}
