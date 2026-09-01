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
  // TODO:
  // ① bq.estimateQueryBytes(opts) で見積もりバイト数を得る
  // ② 見積もりが maxBytes を超えていたら、bq.query は呼ばずに
  //   { ok: false, reason: "too-expensive", scannedBytes: 見積もり, limitBytes: maxBytes } を返す
  // ③ 超えていなければ bq.query(opts) を呼び、その結果(rows[0])と見積もりバイト数を使って
  //   { ok: true, rows, scannedBytes: 見積もり } を返す
  throw new Error("TODO: 未実装");
}

// ログ出力用に1行のメッセージへ整形する。呼び出し側でconsole.logする想定。
export function describeCostGuardResult(result: CostGuardResult): string {
  // TODO: result.ok が true なら scannedBytes と rows.length を含んだ実行成功メッセージ
  // (例: "実行OK: 1200バイトスキャン、3行取得")を、
  // false なら scannedBytes と limitBytes を含んだスキップメッセージ
  // (例: "実行スキップ: 見積もり5000バイト > 上限1000バイト")を返す。
  // 文言は自由だが、上記の数値をすべて文字列内に含めること
  throw new Error("TODO: 未実装");
}
