/* =====================================================================
 * 概念4: table.insert() で行を投入する / 部分失敗(PartialFailureError)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit08 で作る取り込みジョブは「外部APIから100件取ってきて、Prisma に
 *   保存し、同じものを BigQuery にも積む」という処理になります。その
 *   BigQuery 側の書き込みがこれです。
 *   そして実務でいちばん最初に踏む地雷が **部分失敗** です。unit04 の
 *   $transaction では「1件でも失敗したら全部巻き戻る」でした。BigQuery の
 *   ストリーミング挿入には **トランザクションもロールバックも無く**、
 *   「98件は入って2件だけ落ちた」が普通に起こります。しかも黙って
 *   落ちるわけではないのに、例外の中身の掘り方を知らないと
 *   「なんか失敗した」以上のことが分からず、原因調査が止まります。
 *
 * ■ 解説:
 *
 *   ● BigQuery にデータを入れる3つの経路(まず地図)
 *     1. **ストリーミング挿入** `table.insert(rows)` … 今日やるもの。
 *        1行〜数千行を随時投げる。数秒でクエリから見えるようになる。
 *        課金あり(挿入バイト数)。イベントログ向き。
 *     2. **ロードジョブ** … GCS 上の CSV/JSON/Parquet をまとめて取り込む。
 *        **無料**。日次で何百万行、のようなバッチ向き。
 *     3. **DML の INSERT 文** … `INSERT INTO ... VALUES ...` を query() で実行。
 *        1件ずつループで回すのは厳禁(1テーブルあたりの DML 回数に制限があり、
 *        すぐ詰まる)。既存行の一括加工向き。
 *     「1件ずつ来るものは 1、大量の一括は 2」と覚えておけば実務でまず外しません。
 *
 *   ● 呼び方
 *       const table = bq.dataset("app_analytics").table("book_events");
 *       await table.insert(rows);   // rows は「列名→値」のオブジェクトの配列
 *
 *     C# アナロジー: EF Core の `AddRange` + `SaveChanges` に見た目は近い。
 *     でも中身は全然違います。EF Core は1つのトランザクションで全部入るか
 *     全部入らないか。BigQuery の insert は **HTTP の1リクエストで
 *     行を配達するだけ** で、行ごとに成否が決まります。むしろ
 *     「100通のメールをまとめて出したら 2通だけ宛先不明で返ってきた」に近い。
 *
 *   ● PartialFailureError —— RDB では起きない挙動
 *     一部の行が受理されなかったとき、insert() の Promise は **reject** します。
 *     ただし「全部失敗した」わけではありません。受理された行はもう入っています。
 *     投げられるエラーの形:
 *
 *       err.name === "PartialFailureError"     ← instanceof ではなく name で判定するのが作法
 *       err.errors = [
 *         { row: <送った行そのもの>,
 *           errors: [ { message: "Missing required field: event_date.", reason: "invalid" } ] },
 *         ...
 *       ]
 *
 *     ★ `errors` の中にまた `errors` があるのが混乱ポイント。外側が「失敗した行の一覧」、
 *       内側が「その行がなぜダメだったかの理由一覧」です。
 *     ★ err.message は "A failure occurred during this request." のような一般文で、
 *       **原因は一切書いてありません**。掘らないと分からない、が重要。
 *
 *     よくある失敗理由:
 *       ・Missing required field: x     … REQUIRED 列が無い(概念2)
 *       ・no such field: x              … スキーマに無い列を送った(タイプミスの定番)
 *       ・Cannot convert value to INT64 … 型違い(数値のつもりが文字列)
 *
 *     → 実務での作法は「**失敗した行を必ずログに残して、成功分は成功として扱う**」。
 *       握りつぶすと「なぜか2件だけ集計に出てこない」という最悪のバグになります。
 *
 *   ● もうひとつの落とし穴: 重複(at-least-once)
 *     ネットワークが切れて再送した場合、同じ行が2回入ることがあります。
 *     BigQuery には一意制約が無い(概念2)ので、DB は止めてくれません。
 *     ・`insertId` を各行に付けると数分間はベストエフォートで重複排除される
 *       (完全な保証ではなく、Google も「必要なら後段で重複排除を」と案内しています)
 *     ・実務では「イベントID列を持たせておき、集計時に
 *       `SELECT ... FROM (SELECT DISTINCT ...)` や GROUP BY で潰す」
 *       のように **読むときに重複を吸収する** 設計が定石。
 *     unit08 の「二重書き込みをどう防ぐか」でこの続きをやります。
 *
 *   ● ストリーミングバッファ
 *     挿入直後の行はしばらく「ストリーミングバッファ」に居ます。SELECT では
 *     見えますが、その間 UPDATE / DELETE の対象にできません。
 *     「入れた直後に消せない」も RDB 感覚だと驚くところです。
 *
 *   ■ このファイルで使う新しい API:
 *     ・bq.dataset(id).table(id) … テーブルのハンドル(概念1でやった通り通信はしない)
 *     ・table.insert(rows)       … 行を投入する。部分失敗なら PartialFailureError で reject。
 *     ・bq.rowsOf(tableId)       … 偽物だけが持つ確認用。今テーブルに入っている行を返す。
 * ===================================================================== */

import { createFakeBigQuery, type Row, type TableLike } from "../lessonlib/fakeBigQuery.js";
import { BOOK_EVENTS_SCHEMA, SAMPLE_BOOK_EVENTS } from "../lessonlib/bookEvents.js";

// check ヘルパー(全 lesson ファイル共通・先頭に配置)
function check(name: string, actual: unknown, expected: unknown, hint = ""): boolean {
  const ok = actual !== null && actual !== undefined
    && JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) console.log(`[OK] ${name}: 正解!`);
  else {
    console.log(`[NG] ${name}: 期待値 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`);
    if (hint) console.log(`     ヒント: ${hint}`);
  }
  return ok;
}

function newFakeBq() {
  return createFakeBigQuery({
    projectId: "my-bq-study-001",
    datasetId: "app_analytics",
    tables: { book_events: { schema: BOOK_EVENTS_SCHEMA, rows: SAMPLE_BOOK_EVENTS } },
  });
}

// unknown で受けたエラーが「部分失敗」かどうかを判定する型ガード。
// (unit01 概念3 で書いた isBook と同じ発想。err は unknown なので、
//  形を確かめてから中を触るのが TypeScript の作法です)
type PartialFailure = {
  name: string;
  errors: { row: Row; errors: { message: string; reason: string }[] }[];
};
function isPartialFailure(err: unknown): err is PartialFailure {
  return typeof err === "object" && err !== null
    && (err as PartialFailure).name === "PartialFailureError"
    && Array.isArray((err as PartialFailure).errors);
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 正常な挿入と、部分失敗する挿入を両方見る。そして「失敗した行以外は
//       ちゃんと入っている」= ロールバックされないことを自分の目で確認する。

const bq = newFakeBq();
const table = bq.dataset("app_analytics").table("book_events");

// STEP 1: 出発点の件数
console.log("STEP 1: 挿入前の行数 =", bq.rowsOf("book_events").length);

// STEP 2: 正常な2件を投入する
await table.insert([
  { event_id: "ev-101", occurred_at: "2026-09-02T01:00:00Z", event_date: "2026-09-02", source: "openlibrary", book_title: "斜陽", author: "太宰治", price_jpy: 660, rating: 4.0, is_reprint: false, tags: ["classic"] },
  { event_id: "ev-102", occurred_at: "2026-09-02T02:00:00Z", event_date: "2026-09-02", source: "openlibrary", book_title: "山月記", author: "中島敦", price_jpy: 390, rating: 4.4, is_reprint: false, tags: [] },
]);
console.log("STEP 2: 2件挿入後の行数 =", bq.rowsOf("book_events").length);

// STEP 3: 3件のうち2件が不正なバッチを投入してみる
const mixedBatch: Row[] = [
  // OK
  { event_id: "ev-103", occurred_at: "2026-09-02T03:00:00Z", event_date: "2026-09-02", source: "partner-feed", book_title: "羅生門", author: "芥川龍之介", price_jpy: 450, rating: 4.1, is_reprint: false, tags: ["classic"] },
  // NG: REQUIRED の event_date が無い
  { event_id: "ev-104", occurred_at: "2026-09-02T04:00:00Z", source: "partner-feed", book_title: "蜘蛛の糸" },
  // NG: スキーマに無い列 note がある(タイプミスの定番)+ price_jpy が文字列
  { event_id: "ev-105", occurred_at: "2026-09-02T05:00:00Z", event_date: "2026-09-02", source: "partner-feed", price_jpy: "500", note: "メモ" },
];
let caught: unknown = null;
try {
  await table.insert(mixedBatch);
  console.log("STEP 3: 例外は起きなかった");
} catch (err) {
  caught = err;
  console.log("STEP 3: 例外の name =", (err as Error).name);
  console.log("STEP 3: 例外の message =", (err as Error).message);
  console.log("        ↑ message には原因が一切書かれていない。ここで諦めない。");
}

// STEP 4: エラーを掘る。外側 = 失敗した行、内側 = その行の失敗理由。
if (isPartialFailure(caught)) {
  console.log("STEP 4: 失敗した行数 =", caught.errors.length);
  for (const e of caught.errors) {
    console.log(`  - 行 ${String(e.row.event_id)} : ${e.errors.map((x) => x.message).join(" / ")}`);
  }
}

// STEP 5: 失敗した行以外は入っている(ロールバックされない)
const idsNow = bq.rowsOf("book_events").map((r) => r.event_id);
console.log("STEP 5: 挿入後の行数 =", idsNow.length);
console.log("STEP 5: ev-103 は入った? =", idsNow.includes("ev-103"),
  "/ ev-104 は? =", idsNow.includes("ev-104"),
  "/ ev-105 は? =", idsNow.includes("ev-105"));
console.log("        ↑ unit04 の $transaction とは正反対。『同じバッチだから一蓮托生』ではない。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 同じ行(event_id も中身も完全に同じ)を2回 insert したら、
//       2件目はエラーになる? それとも重複したまま2行入る?
//   (2) 全件が正常なバッチを insert したとき、Promise は resolve する?
//       そのとき「何件入ったか」はどこから分かる?
//   (3) catch で捕まえたエラーを `(err as Error).message` だけログに出す運用に
//       していたら、原因調査に必要な情報のうち何が失われる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) まったく同じ行を2回入れる
const dup: Row = { event_id: "ev-200", occurred_at: "2026-09-03T00:00:00Z", event_date: "2026-09-03", source: "manual-import", book_title: "重複テスト", author: "誰か", price_jpy: 100, rating: 1.0, is_reprint: false, tags: [] };
await table.insert([dup]);
await table.insert([dup]);
const dupCount = bq.rowsOf("book_events").filter((r) => r.event_id === "ev-200").length;
console.log("変えてみる (1): ev-200 の行数 =", dupCount);
console.log("        ↑ 一意制約が無いので、何事も無かったかのように2行入る。");
console.log("        『再送 = 重複』を DB は止めてくれない。読む側/書く側で対策する。");

// (2) 全件正常なバッチ
await table.insert([
  { event_id: "ev-201", occurred_at: "2026-09-03T01:00:00Z", event_date: "2026-09-03", source: "manual-import", tags: [] },
]);
console.log("変えてみる (2): 例外が出なければ全件成功。件数は自分で数えるしかない(戻り値には入っていない)。");

// (3) message だけを見る運用と、errors を掘る運用の差
try {
  await table.insert([{ event_id: "ev-202", occurred_at: "2026-09-03T02:00:00Z", source: "manual-import" }]);
} catch (err) {
  console.log("変えてみる (3-a) message だけ:", (err as Error).message);
  if (isPartialFailure(err)) {
    console.log("変えてみる (3-b) errors を掘る:",
      JSON.stringify(err.errors.map((e) => ({ id: e.row.event_id, why: e.errors.map((x) => x.message) }))));
  }
  console.log("        ↑ 『どの行が』『なぜ』落ちたかは errors にしか無い。ログにはこちらを残す。");
}

// --- 書いてみる ---------------------------------------------------------
// 課題: insertWithReport を完成させてください。
//        ・table.insert(rows) を呼ぶ
//        ・全部成功したら { inserted: rows.length, failedIds: [] } を返す
//        ・部分失敗(isPartialFailure が true)なら、失敗した行の event_id を
//          集めて failedIds に、inserted には「送った件数 − 失敗件数」を入れて返す
//        ・部分失敗 **以外** の例外(通信断など)はそのまま投げ直す
//          → 握りつぶすと「本当は1件も入っていない」を成功として報告してしまう
//
// ヒント(概念レベル): try / catch。catch の中で isPartialFailure(err) で分岐し、
//   違ったら throw err。event_id は err.errors[i].row.event_id にあります。
async function insertWithReport(
  table: TableLike,
  rows: Row[],
): Promise<{ inserted: number; failedIds: string[] }> {
  // ここに書く
  return { inserted: 0, failedIds: [] }; // ← 仮の戻り値。書き換えてください
}

// 採点用にまっさらな偽クライアントを用意する(上の実験と混ざらないように)
const bqForCheck = newFakeBq();
const tableForCheck = bqForCheck.dataset("app_analytics").table("book_events");
const report = await insertWithReport(tableForCheck, [
  { event_id: "ev-301", occurred_at: "2026-09-04T01:00:00Z", event_date: "2026-09-04", source: "openlibrary", book_title: "門", author: "夏目漱石", price_jpy: 600, rating: 4.0, is_reprint: false, tags: [] },
  { event_id: "ev-bad", occurred_at: "2026-09-04T02:00:00Z", source: "openlibrary", book_title: "壊れた行" }, // event_date が無い
  { event_id: "ev-302", occurred_at: "2026-09-04T03:00:00Z", event_date: "2026-09-04", source: "openlibrary", book_title: "行人", author: "夏目漱石", price_jpy: 620, rating: 3.7, is_reprint: false, tags: [] },
]);

const result4 = {
  inserted: report.inserted,
  failedIds: report.failedIds,
  // 実際にテーブルに残った行数(元のサンプル8件 + 成功した2件 = 10 のはず)
  rowsInTable: bqForCheck.rowsOf("book_events").length,
};

check("概念4: 部分失敗を握りつぶさずに報告する", result4,
  { inserted: 2, failedIds: ["ev-bad"], rowsInTable: 10 },
  "inserted が 0 で failedIds が [] なら未記入です。rowsInTable が 8 のままなら " +
  "table.insert をまだ呼んでいません。例外がそのまま外に飛んで実行が止まるなら " +
  "try/catch が足りません。inserted が 3 になるなら失敗件数を引いていません。" +
  "failedIds が [] のままなら err.errors から row.event_id を集められていません" +
  "(外側の errors が『失敗した行の一覧』)。");

export {};
