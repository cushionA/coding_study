/* =====================================================================
 * 概念5: スキャン量課金と dryRun(BigQuery で唯一「お金が飛ぶ」話)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   BigQuery を初めて任された人が最も高い確率でやらかすのが、これです。
 *   「動作確認のつもりで `SELECT * FROM 巨大テーブル LIMIT 10` を叩いたら
 *   数万円請求された」は都市伝説ではなく、毎年どこかで起きています。
 *   RDB では「重いクエリ = 遅い」で済みますが、BigQuery では
 *   **重いクエリ = 高い**。しかも一瞬で返ってくるので体感で気づけません。
 *   逆に言えば、課金モデルを1つ覚えるだけで、この事故は完全に防げます。
 *   unit06 で BigQuery を叩く API を公開するとき、
 *   「外から来たパラメータでスキャン量が青天井にならないか」を
 *   考えられるかどうかは、ここを理解しているかで決まります。
 *
 * ■ 解説:
 *
 *   ● 課金の単位は「読んだバイト数」— 行数でも時間でもない
 *     オンデマンド料金は **スキャンしたバイト数** に対して課金されます。
 *     目安として 1 TiB あたり 6.25 USD(リージョンや契約で変わります。
 *     最新の金額は必ず公式の料金ページで確認してください)。
 *     毎月 1 TiB の無料枠があるので、このコース規模なら実機で試しても無料です。
 *     ※ ストレージ料金は別建て(こちらは非常に安い)。
 *
 *   ● なぜ「列」が効くのか —— BigQuery は列指向ストレージ
 *     RDB(行指向)は1行を丸ごと固めて置きます。BigQuery は **列ごとに
 *     まとめて** 置きます。だから「book_title 列だけ読む」が物理的に可能で、
 *     読まなかった列は1バイトも課金されません。
 *     ここから、料金のルールがきれいに導けます:
 *
 *       課金バイト数 = (クエリが参照した列)× (テーブルの全行)
 *
 *     ★ 帰結1: `SELECT *` は全列を参照するので **最も高い**。
 *               本番のコードに SELECT * を書かない、が第一の掟。
 *     ★ 帰結2: **LIMIT では安くならない**。LIMIT は「読み終わった後に
 *               何件返すか」の話で、読む量は変わらないからです。
 *               ここが最大の直感外し。「10件しか見てないのに」が通用しない。
 *     ★ 帰結3: **WHERE でも(基本的には)安くならない**。むしろ WHERE に
 *               書いた列も「参照した列」に数えられるので、**増える**。
 *     ★ 帰結4: ただし **パーティション列で絞ったときだけは減る**
 *               (概念2でやったプルーニング)。`WHERE event_date = '2026-09-01'` が
 *               その日のブロックしか読まないので、行方向に削れる。
 *               クラスタリング列での絞り込みも同様に効きます。
 *               → 「安くしたければ、列を減らす(SELECT)か、パーティションで
 *                 行を減らす(WHERE)」の二択。これが設計の核心。
 *     ★ 帰結5: `SELECT COUNT(*)` は列を1つも読まないので **0 バイト = 無料**。
 *               件数だけ知りたいときに SELECT * して .length を数えない。
 *     ※ 実際には「1クエリ・1テーブルあたり最低 10 MB」という下限があるので、
 *       小さいテーブルでも 0.0000...円ではなく 10 MB 分として計算されます。
 *
 *   ● dryRun —— 実行せずに見積もる
 *       const [job] = await bq.createQueryJob({ query, params, dryRun: true });
 *       const bytes = Number(job.metadata.statistics.totalBytesProcessed);
 *
 *     `createQueryJob` は「クエリジョブを作る」API で、`dryRun: true` を付けると
 *     **実際には実行せず、見積りだけ**返します。dryRun 自体は無料。
 *     C# アナロジー: SQL Server で実行前に実行プランだけ見るのに似ていますが、
 *     見る目的が「速度」ではなく「金額」である点が決定的に違います。
 *
 *     ★ 戻り値が **文字列** なのに注意。BigQuery のバイト数は 2^53 を超え得るので
 *       JSON 上は文字列で運ばれます。Number() で数値にしてから計算します。
 *       (unit02 の zod でやった「外から来た値の型を信用しない」の実例です)
 *
 *   ● もう1枚の保険: maximumBytesBilled
 *       await bq.query({ query, params, maximumBytesBilled: String(10 * 1024 ** 3) });
 *     上限を超えるクエリは **課金されずに失敗** します。ユーザー入力で
 *     条件が変わる API では、これを付けておくと事故が「エラー」で済みます。
 *     (このユニットの偽物クライアントは未対応。実機で使ってください)
 *
 *   ● 補足: 完全に同じクエリの結果は24時間キャッシュされ、再実行は無料です。
 *     「2回目が 0 バイトだった」はバグではありません。
 *
 *   ■ このファイルで使う新しい API:
 *     ・bq.createQueryJob({ query, params, dryRun: true })
 *          … 実行せずに見積りジョブを作る。戻りは [job]。
 *     ・job.metadata.statistics.totalBytesProcessed
 *          … 見積りスキャンバイト数。**文字列**なので Number() で変換する。
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
const TABLE = `\`${PROJECT}.app_analytics.book_events\``;

const bq = createFakeBigQuery({
  projectId: PROJECT,
  datasetId: "app_analytics",
  tables: { book_events: { schema: BOOK_EVENTS_SCHEMA, rows: SAMPLE_BOOK_EVENTS } },
});

// 見積り専用の小さなヘルパー(worked example 用。あとで自分でも書きます)
async function dryRunBytes(client: BigQueryLike, sql: string, params?: Record<string, unknown>): Promise<number> {
  const [job] = await client.createQueryJob({ query: sql, params, dryRun: true });
  return Number(job.metadata.statistics.totalBytesProcessed);
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 同じ8行のテーブルに対し、書き方だけを変えたクエリの「読むバイト数」が
//       どう変わるかを並べて見る。行数は一切変えていない点に注目。

// STEP 1: SELECT * —— 全列を読む
const starBytes = await dryRunBytes(bq, `SELECT * FROM ${TABLE}`);
console.log("STEP 1: SELECT *                     →", starBytes, "バイト");

// STEP 2: 必要な1列だけ
const oneColBytes = await dryRunBytes(bq, `SELECT book_title FROM ${TABLE}`);
console.log("STEP 2: SELECT book_title            →", oneColBytes, "バイト");
console.log("        ↑ 列を絞っただけで", Math.round((1 - oneColBytes / starBytes) * 100), "% 削減。行は1行も減らしていない。");

// STEP 3: 2列にすると足し算になる(列ごとの合計、というモデルの確認)
const twoColBytes = await dryRunBytes(bq, `SELECT book_title, price_jpy FROM ${TABLE}`);
console.log("STEP 3: SELECT book_title, price_jpy →", twoColBytes, "バイト");
console.log("        (book_title の", oneColBytes, "に price_jpy 分が積み上がっただけ)");

// STEP 4: COUNT(*) は列を読まない
const countBytes = await dryRunBytes(bq, `SELECT COUNT(*) AS n FROM ${TABLE}`);
console.log("STEP 4: SELECT COUNT(*)              →", countBytes, "バイト(件数はメタデータから分かる)");

// STEP 5: 金額に換算する。実務ではこの数字をレビューで見せられるようにしておく。
const USD_PER_TIB = 6.25;
const TIB = 1024 ** 4;
const asIf1TB = (bytes: number) => (bytes / TIB) * USD_PER_TIB;
console.log("STEP 5: 8行なら誤差だが、同じ形のテーブルが 1 TiB あったら:");
console.log("        SELECT *      の割合 →", (starBytes / starBytes).toFixed(2), "倍 =",
  asIf1TB(TIB).toFixed(2), "USD");
console.log("        SELECT 1列    の割合 →", (oneColBytes / starBytes).toFixed(2), "倍 =",
  asIf1TB(TIB * (oneColBytes / starBytes)).toFixed(2), "USD");
console.log("        ↑ 毎時実行するダッシュボード用クエリなら、この差が月額そのまま。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) `SELECT book_title FROM ... LIMIT 1` のスキャンバイト数は、
//       LIMIT 無しの 136 バイトと比べてどうなる? 1/8 になる? 変わらない?
//   (2) `SELECT book_title FROM ... WHERE source = @s` はどうなる?
//       絞り込むぶん減る? 増える? 変わらない?
//   (3) `SELECT * FROM ... WHERE event_date = @d` は SELECT * より安くなる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const limitBytes = await dryRunBytes(bq, `SELECT book_title FROM ${TABLE} LIMIT 1`);
console.log("変えてみる (1): ... LIMIT 1          →", limitBytes, "バイト(LIMIT 無しは", oneColBytes, ")");
console.log("        ↑ 1 バイトも減らない。LIMIT は『読んだ後に何件返すか』でしかない。");

const whereBytes = await dryRunBytes(bq, `SELECT book_title FROM ${TABLE} WHERE source = @s`, { s: "openlibrary" });
console.log("変えてみる (2): ... WHERE source     →", whereBytes, "バイト");
console.log("        ↑ 増えた。WHERE に書いた source 列も『読んだ列』に数えられるから。");

const whereStarBytes = await dryRunBytes(bq, `SELECT * FROM ${TABLE} WHERE event_date = @d`, { d: "2026-09-01" });
console.log("変えてみる (3): SELECT * WHERE 日付  →", whereStarBytes, "バイト(SELECT * は", starBytes, ")");
console.log("        ↑ 変わらない。この偽物テーブルにはパーティションが無いから。");
console.log("        本物で event_date を DAY パーティションにしてあれば、ここだけは");
console.log("        『その日のブロックしか読まない』で大きく下がる。これがプルーニング。");

// --- 書いてみる ---------------------------------------------------------
// 課題: 実行前にコストを見積もる2つの関数を完成させてください。
//
//   1. estimateCostUsd(bytes)
//        スキャンバイト数から USD を計算する。1 TiB = USD_PER_TIB ドル。
//        端数は round6 で丸めて返す(上で定義済みの TIB / USD_PER_TIB / round6 を使う)。
//   2. planQuery(client, sql)
//        dryRun でスキャンバイト数を調べ、{ bytes, usd } を返す。
//        ★ totalBytesProcessed は文字列なので Number() を通すこと。
//
// ヒント(概念レベル): 1 は割り算と掛け算だけ。2 は createQueryJob に
//   dryRun: true を付けて呼び、戻りを [job] で受けて metadata を辿ります。
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

function estimateCostUsd(bytes: number): number {
  // ここに書く(USD を返す。round6 で丸める)
  return 0; // ← 仮の戻り値。書き換えてください
}

async function planQuery(client: BigQueryLike, sql: string): Promise<{ bytes: number; usd: number }> {
  // ここに書く({ bytes, usd } を返す)
  return { bytes: 0, usd: 0 }; // ← 仮の戻り値。書き換えてください
}

const planStar = await planQuery(bq, `SELECT * FROM ${TABLE}`);
const planNarrow = await planQuery(bq, `SELECT book_title FROM ${TABLE}`);
console.log("あなたの見積り: SELECT * =", planStar, "/ 1列 =", planNarrow);

const result5 = {
  usdPer1TiB: estimateCostUsd(TIB),
  usdPer200GiB: estimateCostUsd(200 * 1024 ** 3),
  starBytes: planStar.bytes,
  narrowBytes: planNarrow.bytes,
  narrowIsCheaper: planNarrow.bytes < planStar.bytes,
};

check("概念5: dryRun で実行前に見積もる", result5,
  { usdPer1TiB: 6.25, usdPer200GiB: 1.220703, starBytes: 754, narrowBytes: 136, narrowIsCheaper: true },
  "usdPer1TiB が 0 なら estimateCostUsd が未記入です。6250000 のように巨大な値なら " +
  "TIB で割るのを忘れています。usdPer200GiB が丸められていないなら round6 を通してください。" +
  "starBytes が 0 なら planQuery が未記入か、createQueryJob に dryRun: true を渡していません。" +
  "starBytes が NaN なら totalBytesProcessed を Number() で数値に変換していません" +
  "(あの値は文字列です)。");

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */

/* =====================================================================
 * まとめと次へ
 * ---------------------------------------------------------------------
 * new BigQuery({ projectId })
 *     … 生成時は通信も認証もしない。鍵の設定ミスは最初の API 呼び出しで露見する。
 * ADC(Application Default Credentials)
 *     … GOOGLE_APPLICATION_CREDENTIALS の鍵ファイル → gcloud のユーザー資格情報
 *       → 実行環境のメタデータサーバ、の順に探す。コードに鍵を書かないための共通ルール。
 *       認証(誰か)と認可(ロール: dataEditor / jobUser)は別物。
 * project . dataset . table の3階層 / スキーマは { fields: [{name, type, mode}] }
 *     … STRING・INT64・FLOAT64・BOOL・TIMESTAMP(ISO文字列)・DATE(YYYY-MM-DD)。
 *       mode は REQUIRED / NULLABLE / REPEATED(= 配列列。RDB に無い3つ目)。
 *       一意制約も外部キーも無い。パーティションとクラスタリングは作成時に決める。
 * bq.query({ query, params })
 *     … 値は必ず params で渡す。SQL 文字列に連結した瞬間にインジェクションの穴が開く。
 *       GoogleSQL は識別子をバッククォート、文字列をシングルクォート。
 *       結果は const [rows] = await ... で受ける。
 * table.insert(rows)
 *     … ストリーミング挿入。トランザクションもロールバックも無い。
 *       一部の行だけ失敗すると PartialFailureError。err.name で判定し、
 *       err.errors[].row と err.errors[].errors[].message を必ずログに残す。
 * 課金はスキャンしたバイト数
 *     … 参照した列 × 全行。SELECT * は高く、LIMIT では安くならない。
 *       安くする道は「列を減らす」か「パーティション列で絞る」の二択。
 *       COUNT(*) は 0 バイト。createQueryJob({ dryRun: true }) で事前に見積もる。
 *
 * ここまでで「データの置き場所」は3つとも揃いました:
 *   外部API(unit02) → アプリDB / Prisma(unit03・04) → 分析基盤 / BigQuery(unit05)。
 *
 * 次の unit06 では、この3つを **1つの入口にまとめる** Express の API サーバを作ります。
 * 今日の話が直接効いてくる場面が2つあります:
 *   ・**鍵の境界** — サービスアカウント鍵と ADC はサーバ側だけに置き、
 *     ブラウザには絶対に渡さない(unit01 概念1で引いた境界線の実装編)。
 *   ・**外から来た値** — クエリ文字列 ?source=... がそのまま SQL に入らないよう、
 *     zod で入口検証し、params 経由で BigQuery に渡す。今日の概念3がそのまま出てきます。
 * そして「外から来た値でスキャン量が青天井にならないか」を考える癖も、
 * 今日の概念5を持っていれば自然に働くようになります。
 * ===================================================================== */
