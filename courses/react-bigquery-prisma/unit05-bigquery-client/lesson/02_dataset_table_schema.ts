/* =====================================================================
 * 概念2: データセット・テーブル・スキーマ(BigQuery の型と、TS の型の対応)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   分析基盤の仕事は「クエリを書くこと」より先に「テーブルを設計すること」
 *   から始まります。しかも BigQuery のテーブルは、RDB のように後から
 *   ALTER TABLE で気軽に作り直せない場面が多い(パーティション列や
 *   ロケーションは作成時にしか決められない)。ここを雑に決めると、
 *   3か月後に「毎回フルスキャンで料金が跳ねる」「日付で絞れない」という
 *   形で必ず返ってきます。今日の 概念5(課金)の伏線がここです。
 *
 * ■ 解説:
 *
 *   ● 3階層の名前 —— project . dataset . table
 *       my-bq-study-001 . app_analytics . book_events
 *       └ プロジェクト     └ データセット   └ テーブル
 *
 *     **データセット**は「テーブルを入れる箱」。C# で言えば namespace、
 *     RDB で言えばスキーマ(PostgreSQL の schema)に相当します。
 *     箱そのものにはデータが入りません。持っている設定は主に2つ:
 *       ・ロケーション(asia-northeast1 など。**作成後に変更不可**)
 *       ・既定のテーブル有効期限
 *     ロケーションが違うデータセット同士は JOIN できません。
 *     だから「まず app_analytics を asia-northeast1 に1つ作り、
 *     分析用テーブルは全部そこに入れる」が定石です。
 *
 *   ● テーブルは「スキーマ」を持つ —— ただし RDB のスキーマとは少し違う
 *     BigQuery のスキーマは、フィールドの配列にすぎません:
 *
 *       { fields: [ { name, type, mode }, ... ] }
 *
 *     RDB との一番大きな違いは **主キーも外部キーも一意制約も無い**こと
 *     (最近のBigQueryには「情報提供用」の主キー宣言はありますが、
 *      強制はされません)。「重複を弾く仕組みは無い」を前提に設計します。
 *     unit04 でやった upsert の冪等性が、こちら側では使えない——
 *     だから取り込みジョブ側で気をつける、という話に unit08 で繋がります。
 *
 *   ● 型の対応表(このコースで使う範囲。BigQuery の型 → TypeScript の型)
 *
 *       STRING    → string        可変長テキスト。長さ上限を宣言しない(VARCHAR(n) が無い)
 *       INT64     → number        64bit 整数。C# の long。
 *                                 ★ JS の number は 2^53 までしか正確に表せないので、
 *                                   本物のクライアントは巨大な整数を BigQueryInt という
 *                                   オブジェクトで返すことがある(wrapIntegers オプション)。
 *       FLOAT64   → number        C# の double。金額に使わないこと(丸め誤差)。
 *       BOOL      → boolean       C# の bool。
 *       TIMESTAMP → string(ISO)  「絶対時刻」。内部は常に UTC。C# の DateTimeOffset。
 *       DATE      → string        「日付だけ」。"2026-09-01" 形式。C# の DateOnly。
 *
 *     ★ 読み書きで形が違う点に注意:
 *       ・**書く**とき: ISO文字列 "2026-09-01T04:30:00.000Z" をそのまま渡せる。
 *       ・**読む**とき: 本物のクライアントは TIMESTAMP を BigQueryTimestamp、
 *         DATE を BigQueryDate というラッパーオブジェクトで返す。中身は
 *         `.value` に文字列で入っている。JSON.stringify したら
 *         `{"value":"2026-09-01"}` になって驚く、が新人の通過儀礼です。
 *       (このユニットの偽物クライアントは、話を単純にするため読み書き
 *        どちらも素の文字列で扱います。)
 *
 *   ● mode —— NULL を許すか、配列か(RDB に無い3つ目がある)
 *       REQUIRED … NOT NULL。値を省略した行は **その行だけ** 拒否される。
 *       NULLABLE … 既定。null や未指定を許す。
 *       REPEATED … **その列自体が配列**。1行の中に 0..N 個の値を持てる。
 *                  RDB なら別テーブル + JOIN にするところを、1列で表現する。
 *                  TypeScript では string[] / number[] に対応。
 *                  BigQuery は列指向で、配列を展開する UNNEST という演算子を
 *                  持っているので、これで困りません。
 *
 *     「非正規化してもよい(むしろ推奨)」が OLAP 側の発想です。unit03 で見た
 *     OLTP(正規化して JOIN)との設計思想の違いが、ここに一番はっきり出ます。
 *
 *   ● テーブル作成時にしか決められない2つ —— パーティションとクラスタリング
 *       dataset.createTable("book_events", {
 *         schema: BOOK_EVENTS_SCHEMA,
 *         timePartitioning: { type: "DAY", field: "event_date" },
 *         clustering: { fields: ["source", "author"] },
 *       });
 *
 *     ・**パーティション**: 指定した日付列の値ごとに、物理的にデータを
 *       分けて置く。`WHERE event_date = '2026-09-01'` と書くと、その日の
 *       ぶんだけを読む(= **料金が下がる**)。これを「パーティションプルーニング」
 *       と呼びます。RDB のインデックスが「速くする」道具なのに対し、
 *       BigQuery のパーティションは「**安くする**」道具、という理解が重要。
 *     ・**クラスタリング**: 指定した列で近い値どうしを近くに並べておく。
 *       `WHERE source = 'openlibrary'` のような絞り込みで読む量が減る。
 *
 *     どちらも「よく WHERE に書く列」を選ぶのがコツ。逆に言えば、
 *     **どう問い合わせるかを決めてからテーブルを作る**ということです。
 *
 *   ■ このファイルで使う新しい API:
 *     ・BOOK_EVENTS_SCHEMA … lessonlib/bookEvents.ts に置いた、このコース共通の
 *                            サンプルスキーマ({ fields: [...] } という素のデータ)。
 *     ・dataset.createTable(id, options) … テーブルを作る(★今日は呼びません。形だけ見ます)。
 * ===================================================================== */

import { BigQuery } from "@google-cloud/bigquery";
import { BOOK_EVENTS_SCHEMA, SAMPLE_BOOK_EVENTS } from "../lessonlib/bookEvents.js";
import type { BqField, BqSchema, Row } from "../lessonlib/fakeBigQuery.js";

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

// --- 見る(worked example) ---------------------------------------------
// GOAL: スキーマが「ただのデータ(配列)」であることと、type / mode が
//       1行の受理・拒否をどう左右するかを、目で見て確かめる。

// STEP 1: スキーマを表として眺める。TS 側でどう表現されるかを並べて書く。
const TS_TYPE_OF: Record<string, string> = {
  STRING: "string", INT64: "number", FLOAT64: "number",
  BOOL: "boolean", TIMESTAMP: "string(ISO)", DATE: "string(YYYY-MM-DD)",
};
console.log("STEP 1: app_analytics.book_events のスキーマ");
for (const f of BOOK_EVENTS_SCHEMA.fields) {
  const tsType = f.mode === "REPEATED" ? `${TS_TYPE_OF[f.type]}[]` : TS_TYPE_OF[f.type];
  const nullable = f.mode === "NULLABLE" ? " | null" : "";
  console.log(`  ${f.name.padEnd(13)} ${f.type.padEnd(10)} ${f.mode.padEnd(9)} → TS: ${tsType}${nullable}`);
}

// STEP 2: 完全修飾名。GoogleSQL では **バッククォート** で囲むのが作法(概念3で使います)。
const bq = new BigQuery({ projectId: "my-bq-study-001" });
const fqTable = `${bq.projectId}.app_analytics.book_events`;
console.log("STEP 2: SQL に書くときの形 = FROM `" + fqTable + "`");

// STEP 3: 1行の実物を見る。REPEATED 列が「配列そのもの」であることを確認。
const sample = SAMPLE_BOOK_EVENTS[0]!;
console.log("STEP 3: サンプル行 =", JSON.stringify(sample));
console.log("STEP 3: tags は配列 =", Array.isArray(sample.tags), "/ 中身 =", sample.tags);

// STEP 4: mode / type が「行の受理」をどう決めるかを確かめるための小さな検査器。
//         (BigQuery が挿入時に内部でやっていることの、ごく簡略版です)
function violationsOf(schema: BqSchema, row: Row): string[] {
  const problems: string[] = [];
  const known = new Set(schema.fields.map((f) => f.name));
  for (const key of Object.keys(row)) {
    if (!known.has(key)) problems.push(`no such field: ${key}`);
  }
  for (const f of schema.fields) {
    const v = row[f.name];
    if (v === undefined || v === null) {
      if (f.mode === "REQUIRED") problems.push(`Missing required field: ${f.name}`);
      continue;
    }
    if (f.mode === "REPEATED" && !Array.isArray(v)) problems.push(`${f.name} は配列でなければならない`);
    if (f.mode !== "REPEATED" && Array.isArray(v)) problems.push(`${f.name} は配列にできない`);
  }
  return problems;
}
const minimalRow: Row = {
  event_id: "ev-100", occurred_at: "2026-09-02T00:00:00Z",
  event_date: "2026-09-02", source: "manual-import",
};
console.log("STEP 4: NULLABLE と REPEATED を全部省略した行の問題 =", violationsOf(BOOK_EVENTS_SCHEMA, minimalRow));
console.log("        ↑ 問題リストが空 = 受理される行。NULLABLE は省略してよく、");
console.log("        REPEATED も『0個』が許されるので省略できる。REQUIRED の4列だけが必須。");

// STEP 5: テーブル作成オプションの形だけ見る(★ createTable は呼びません)
const CREATE_TABLE_OPTIONS = {
  schema: BOOK_EVENTS_SCHEMA,
  timePartitioning: { type: "DAY", field: "event_date" },
  clustering: { fields: ["source", "author"] },
};
console.log("STEP 5: createTable に渡すオプション(パーティション列 =",
  CREATE_TABLE_OPTIONS.timePartitioning.field, "/ クラスタ列 =",
  CREATE_TABLE_OPTIONS.clustering.fields.join(", "), ")");
console.log("        ↑ 実行するとしたら bq.dataset('app_analytics').createTable('book_events', options)。");
console.log("        この2つは後から付け替えられない。『どう WHERE するか』を先に決める理由。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) event_date(REQUIRED)を省いた行は、violationsOf で何と言われる?
//   (2) is_reprint(NULLABLE)に明示的に null を入れた行は、問題ありと言われる?
//   (3) tags(REPEATED)に配列ではなく文字列 "classic" を入れたら?
//   (4) スキーマに無い列 note を足した行は?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const cases: Array<[string, Row]> = [
  ["(1) REQUIRED を省略", { event_id: "ev-a", occurred_at: "2026-09-02T00:00:00Z", source: "x" }],
  ["(2) NULLABLE に null", { event_id: "ev-b", occurred_at: "2026-09-02T00:00:00Z", event_date: "2026-09-02", source: "x", is_reprint: null }],
  ["(3) REPEATED に文字列", { event_id: "ev-c", occurred_at: "2026-09-02T00:00:00Z", event_date: "2026-09-02", source: "x", tags: "classic" }],
  ["(4) 未知の列を追加", { event_id: "ev-d", occurred_at: "2026-09-02T00:00:00Z", event_date: "2026-09-02", source: "x", note: "メモ" }],
];
for (const [label, row] of cases) {
  console.log("変えてみる", label, "→", violationsOf(BOOK_EVENTS_SCHEMA, row));
}
console.log("        ↑ (4) が効くのがポイント。BigQuery は『知らない列は勝手に足しておく』ような");
console.log("        親切はしません。スキーマに無い列を送るとその行は弾かれます(概念4に直結)。");

// --- 書いてみる ---------------------------------------------------------
// 課題: TypeScript のドメインオブジェクトを、下の ingest_runs スキーマに
//        合う「BigQuery の行」に変換する toBqRow を完成させてください。
//
//   ・列名は snake_case(TS 側は camelCase)。名前の付け替えが要ります。
//   ・started_at は TIMESTAMP → ISO 文字列に。
//   ・run_date は DATE → "YYYY-MM-DD" の10文字に(started_at と同じ日)。
//   ・それ以外はそのまま移すだけ。
//
// ヒント(概念レベル): Date → ISO 文字列は toISOString()。DATE 列はその先頭
//   10文字。返すのはただのオブジェクト(Row = Record<string, unknown>)です。
const INGEST_RUNS_SCHEMA: BqSchema = {
  fields: [
    { name: "run_id", type: "STRING", mode: "REQUIRED" },
    { name: "started_at", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "run_date", type: "DATE", mode: "REQUIRED" },
    { name: "source", type: "STRING", mode: "REQUIRED" },
    { name: "fetched_count", type: "INT64", mode: "REQUIRED" },
    { name: "success_rate", type: "FLOAT64", mode: "NULLABLE" },
    { name: "completed", type: "BOOL", mode: "REQUIRED" },
    { name: "tags", type: "STRING", mode: "REPEATED" },
  ] satisfies BqField[],
};

type IngestRunSummary = {
  runId: string;
  startedAt: Date;
  source: string;
  fetchedCount: number;
  successRate: number;
  completed: boolean;
  tags: string[];
};

function toBqRow(run: IngestRunSummary): Row {
  // ここに書く(INGEST_RUNS_SCHEMA の8列をすべて持つオブジェクトを return する)
  return {}; // ← 仮の戻り値。書き換えてください
}

const run1: IngestRunSummary = {
  runId: "run-2026-09-01-a",
  startedAt: new Date("2026-09-01T04:30:00.000Z"),
  source: "openlibrary",
  fetchedCount: 128,
  successRate: 0.984,
  completed: true,
  tags: ["nightly", "batch"],
};

// キーを書いた順番で結果が変わらないよう、比較の前にキー名で並べ替えます
function sortKeys(row: Row): Row {
  return Object.fromEntries(Object.entries(row).sort(([a], [b]) => (a < b ? -1 : 1)));
}
const result2 = sortKeys(toBqRow(run1));
console.log("あなたの toBqRow の結果 =", JSON.stringify(result2));
console.log("スキーマ違反 =", violationsOf(INGEST_RUNS_SCHEMA, result2));

check("概念2: TS の値を BigQuery の行に変換する", result2,
  {
    completed: true,
    fetched_count: 128,
    run_date: "2026-09-01",
    run_id: "run-2026-09-01-a",
    source: "openlibrary",
    started_at: "2026-09-01T04:30:00.000Z",
    success_rate: 0.984,
    tags: ["nightly", "batch"],
  },
  "{} のままなら未記入です。started_at が {} や数値になるなら Date をそのまま入れています" +
  "(TIMESTAMP には ISO 文字列を渡す)。run_date が長すぎるなら DATE 列に日時をまるごと" +
  "入れています(先頭10文字だけ)。キー名が camelCase のままなら snake_case への" +
  "付け替えが漏れています。上の『スキーマ違反』の行も手がかりになります。");

export {};
