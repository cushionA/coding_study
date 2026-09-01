/* =====================================================================
 * 概念3: パラメータ化クエリ(params)と GoogleSQL の作法
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit06 で作る Express API には `/api/stats?source=openlibrary` のような
 *   エンドポイントが並びます。その `source` は **ブラウザから来た文字列**、
 *   つまり誰でも好きな値に書き換えられる文字列です。それを SQL に
 *   そのまま連結した瞬間、SQLインジェクションの穴が開きます。
 *   Prisma を使っている間は、Prisma が裏で全部パラメータ化してくれていた
 *   ので意識せずに済みました。BigQuery クライアントは **SQL 文字列を
 *   自分で書く** ので、この責任がこちらに戻ってきます。
 *   ここは「知らなかった」で済まない場所なので、今日いちばん丁寧にやります。
 *
 * ■ 解説:
 *
 *   ● クエリを投げる基本形
 *       const [rows] = await bq.query({
 *         query: "SELECT book_title FROM `p.app_analytics.book_events` WHERE source = @source",
 *         params: { source: "openlibrary" },
 *       });
 *
 *     ・戻り値が `[rows]` という **配列の分割代入** なのが独特です。
 *       このライブラリの慣習で、実体は [行の配列, 次ページ情報, APIの生レスポンス]
 *       のようなタプル。ふだんは先頭だけ使うので `const [rows] = ...` と書きます。
 *     ・`rows` の型は any[] 相当(ライブラリは中身を知りようがない)。
 *       unit01 概念3 の `as` と同じ話で、自分の型に落として使います。
 *
 *   ● パラメータの書き方
 *       名前付き:  ... WHERE source = @source AND price_jpy >= @minPrice
 *                  params: { source: "openlibrary", minPrice: 700 }
 *       位置指定:  ... WHERE source = ?      params: ["openlibrary"]
 *     実務では **名前付き** を使ってください(引数の順番ミスが起きない)。
 *     C# の `SqlCommand.Parameters.AddWithValue("@source", value)` と同じ考え方です。
 *
 *     ★ なぜ安全なのか(ここが本質):
 *       params の値は **SQL 文字列の中に入りません**。SQL文とデータは
 *       別々のフィールドとして API に送られ、BigQuery 側で「これはデータだ」と
 *       確定した状態で扱われます。だから値の中に `' OR 1=1 --` が入っていても、
 *       それは「そういう文字列を探す条件」になるだけで、構文としては解釈されない。
 *       文字列連結だと SQL とデータの境界が消えるので、値が構文に化けます。
 *       このファイルでは、その差を実際に動かして目で見ます。
 *
 *     ★ NULL を渡すときだけ注意: params: { author: null } は「型が分からない」
 *       と怒られます。`types: { author: "STRING" }` を添えて型を教えます。
 *
 *   ● GoogleSQL 方言の勘所(標準SQLとの差でつまずく所)
 *     ・**識別子はバッククォート**: FROM \`my-proj.app_analytics.book_events\`
 *       プロジェクトIDにハイフンが入るのが普通なので、囲まないと構文エラーです。
 *       MySQL と同じ記法ですが、SQL Server の [角括弧] や PostgreSQL の
 *       "ダブルクォート" とは違います。
 *     ・**文字列リテラルはシングルクォート**: WHERE source = 'openlibrary'
 *       ダブルクォートも使えますが、混乱するのでシングルに統一するのが作法。
 *     ・型変換は `CAST(x AS INT64)`。失敗したら NULL にしたいなら
 *       **`SAFE_CAST(x AS INT64)`** を使う(BigQuery 独特の「SAFE_」接頭辞。
 *       エラーで全体を落とさず NULL にして続行する系の関数群)。
 *     ・日付は専用関数が豊富: `DATE(occurred_at)`(TIMESTAMP→DATE)、
 *       `DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)`、`FORMAT_DATE('%Y-%m', d)` など。
 *       「日別集計」は BigQuery でいちばんよく書くクエリです。
 *     ・配列(REPEATED 列)を行に展開するのが `UNNEST`:
 *       `SELECT tag FROM t, UNNEST(tags) AS tag`。
 *     ※ SAFE_CAST / UNNEST / 日付関数は「名前と用途を知っておく」だけで十分です。
 *        このユニットの偽物エンジンは対応していません(実機でぜひ試してください)。
 *
 *   ■ このファイルで使う新しい API / 型:
 *     ・createFakeBigQuery({ projectId, datasetId, tables })
 *          … lessonlib/fakeBigQuery.ts が提供するインメモリの偽 BigQuery。
 *            本物と同じ呼び方(query / dataset().table().insert / createQueryJob)ができる。
 *     ・BigQueryLike … 本物の「よく使う部分だけ」を写した最小インターフェース。
 *          interface BigQueryLike {
 *            readonly projectId: string;
 *            query(options: QueryLike): Promise<[Row[]]>;
 *            createQueryJob(options: QueryLike): Promise<[JobLike]>;
 *            dataset(datasetId: string): DatasetLike;
 *          }
 *          type QueryLike = { query: string; params?: Record<string, unknown>; dryRun?: boolean };
 *       関数の引数を `BigQueryLike` にしておくと、本番では本物、テストでは偽物を
 *       渡せます(C# の「具象クラスではなくインターフェースに依存する」と同じ)。
 *       演習 ex02〜ex04 もこの形で採点されます。
 *     ・bq.sentQueries … 偽物だけが持つ確認用の配列。実際に「送られた SQL 文字列」が入る。
 * ===================================================================== */

import { createFakeBigQuery, type BigQueryLike } from "../lessonlib/fakeBigQuery.js";
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

const PROJECT = "my-bq-study-001";
const TABLE = `\`${PROJECT}.app_analytics.book_events\``; // SQL に埋め込む完全修飾名(バッククォート付き)

function newFakeBq() {
  return createFakeBigQuery({
    projectId: PROJECT,
    datasetId: "app_analytics",
    tables: { book_events: { schema: BOOK_EVENTS_SCHEMA, rows: SAMPLE_BOOK_EVENTS } },
  });
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: params 付きの query を投げ、返ってきた行を見る。そして「実際に
//       BigQuery へ送られた SQL 文字列」に値が入っていないことを確認する。

const bq = newFakeBq();

// STEP 1: いちばん素直なパラメータ化クエリ
const [rows1] = await bq.query({
  query: `SELECT book_title, price_jpy FROM ${TABLE} WHERE source = @source ORDER BY price_jpy DESC`,
  params: { source: "openlibrary" },
});
console.log("STEP 1: 返ってきた行 =", JSON.stringify(rows1));
console.log("STEP 1: 件数 =", rows1.length);

// STEP 2: 送られた SQL そのものを覗く。値は SQL の中に「入っていない」。
console.log("STEP 2: 実際に送られた SQL =", bq.sentQueries.at(-1));
console.log("        ↑ 'openlibrary' という文字はどこにも無い。@source のまま。");
console.log("        値は params として別便で運ばれ、BigQuery 側でデータとして束縛される。");

// STEP 3: 条件を2つに増やす。params にキーを足すだけ。
const [rows2] = await bq.query({
  query: `SELECT book_title, price_jpy, author FROM ${TABLE} `
    + `WHERE source = @source AND price_jpy >= @minPrice ORDER BY price_jpy DESC`,
  params: { source: "openlibrary", minPrice: 700 },
});
console.log("STEP 3: 700円以上 =", JSON.stringify(rows2));

// STEP 4: 集計。BigQuery で最もよく書く形(日別・カテゴリ別の件数)。
const [rows3] = await bq.query({
  query: `SELECT source, COUNT(*) AS events FROM ${TABLE} `
    + `WHERE event_date >= @from GROUP BY source ORDER BY events DESC`,
  params: { from: "2026-08-31" },
});
console.log("STEP 4: 取り込み元別の件数 =", JSON.stringify(rows3));

// STEP 5: 【悪い例】文字列連結で組み立てる。普通の値なら「動いてしまう」のが厄介な所。
function buildConcatQuery(source: string): string {
  // ★★ 実務でこれを書いてはいけません。ここでは危険を体感するためだけに書いています ★★
  return `SELECT book_title FROM ${TABLE} WHERE source = '${source}'`;
}
const [rows4] = await bq.query({ query: buildConcatQuery("openlibrary") });
console.log("STEP 5: 連結版でも正常な値なら動く =", JSON.stringify(rows4));
console.log("STEP 5: 送られた SQL =", bq.sentQueries.at(-1));
console.log("        ↑ こちらは値が SQL の中に溶け込んでしまっている。ここが分かれ目。");

// --- 予測してみよう -----------------------------------------------------
// 攻撃者が source として次の文字列を送ってきたとします:
//     x' OR 1=1 OR 'a'='a
// 次のブロックを実行する前に予測してください:
//   (1) **params 版**にこの文字列を渡すと、何件返ってくる? 全8件? 0件? 例外?
//   (2) **連結版**にこの文字列を渡すと、出来上がる SQL はどんな文になる?
//       そして何件返ってくる?
//   (3) params 版で、SQL に書いた @minPrice を params に入れ忘れたらどうなる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const EVIL = "x' OR 1=1 OR 'a'='a";

// (1) パラメータ化版に悪意ある文字列を渡す
const [safeRows] = await bq.query({
  query: `SELECT book_title FROM ${TABLE} WHERE source = @source`,
  params: { source: EVIL },
});
console.log("変えてみる (1): params 版の件数 =", safeRows.length, "→", JSON.stringify(safeRows));
console.log("        ↑ 『そんな名前の source を探す』になっただけ。構文には化けない。");

// (2) 連結版に同じ文字列を渡す
const evilSql = buildConcatQuery(EVIL);
console.log("変えてみる (2): 出来上がった SQL =", evilSql);
const [leakedRows] = await bq.query({ query: evilSql });
console.log("変えてみる (2): 連結版の件数 =", leakedRows.length, "(テーブル全体の件数 = 8)");
console.log("        ↑ WHERE が丸ごと無効化され、全行が漏れた。これが SQL インジェクション。");
console.log("        本番なら『他社のデータまで返す API』が完成していたことになる。");

// (3) SQL に書いたパラメータを params に入れ忘れる
try {
  await bq.query({
    query: `SELECT book_title FROM ${TABLE} WHERE price_jpy >= @minPrice`,
    params: {}, // ← minPrice を入れ忘れた
  });
  console.log("変えてみる (3): 例外にならなかった");
} catch (err) {
  console.log("変えてみる (3): 例外 →", (err as Error).message);
  console.log("        ↑ 本物の BigQuery も『Undeclared query parameter』で拒否します。");
  console.log("        SQL とパラメータの対応漏れは、黙って NULL 扱いされるより遥かに安全。");
}

// --- 書いてみる ---------------------------------------------------------
// 課題: findExpensiveBooks を完成させてください。
//        ・取り込み元 source が一致し、かつ price_jpy が minPrice 以上の行を選ぶ
//        ・price_jpy の **降順** に並べる
//        ・book_title だけを取り出した string[] を返す
//        ・値は必ず params で渡す(SQL に埋め込まない)
//
// ヒント(概念レベル): SQL 側には @名前 を書き、params オブジェクトに同じ名前の
//   キーで値を入れる。await bq.query({...}) の戻りは [rows] で受け、rows を map する。
//   SQL に書く表名は上で用意した TABLE 定数がそのまま使えます。
async function findExpensiveBooks(
  bq: BigQueryLike,
  source: string,
  minPrice: number,
): Promise<string[]> {
  // ここに書く(タイトルの配列を return する)
  return []; // ← 仮の戻り値。書き換えてください
}

// 採点用にまっさらな偽クライアントを用意する(上の実験のログと混ざらないように)
const bqForCheck = newFakeBq();
const titles = await findExpensiveBooks(bqForCheck, "openlibrary", 700);
const sentSql = bqForCheck.sentQueries.at(-1) ?? "(1回も query が呼ばれていません)";
console.log("あなたが送った SQL =", sentSql);

const result3 = {
  titles,
  // SQL の中にプレースホルダがあるか(= パラメータ化できているか)
  usesPlaceholders: sentSql.includes("@"),
  // SQL の中に生の値が埋め込まれてしまっていないか
  hasRawValue: sentSql.includes("openlibrary") || sentSql.includes("700"),
};

check("概念3: パラメータ化クエリで安全に絞り込む", result3,
  { titles: ["こころ", "吾輩は猫である"], usesPlaceholders: true, hasRawValue: false },
  "titles が [] なら未記入か、query を呼んでいません。順番が逆なら ORDER BY ... DESC が" +
  "抜けています。件数が多すぎるなら price_jpy >= @minPrice の条件が抜けています。" +
  "hasRawValue が true なら値を SQL に文字列連結してしまっています(params で渡す)。" +
  "usesPlaceholders が false なら SQL に @名前 を書けていません。" +
  "行オブジェクトから文字列を取り出すのを忘れると titles に {} が並びます。");

export {};
