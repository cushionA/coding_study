/* =====================================================================
 * 概念2: HTMLのtableを行×列の2次元データに変換する
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   統計データ・料金表・スケジュール表など、実務のスクレイピング対象には
 *   table要素が頻出します。tableは thead(見出し行)/ tbody(データ行)という
 *   決まった階層を持つので、いつも同じパターンで「見出しをキー、各セルを値」の
 *   オブジェクト配列に変換できます。C#で言えばDataTableをList<Dictionary<string,string>>
 *   に変換する定型処理に相当します。
 *
 * ■ 解説:
 *   tableの構造:
 *     table
 *      ├─ thead
 *      │   └─ tr → th, th, th        (見出し行)
 *      └─ tbody
 *          ├─ tr → td, td, td        (データ行1)
 *          └─ tr → td, td, td        (データ行2)
 *
 *   変換は3段階に分解できる:
 *     (1) 見出しを配列で取る:      $("table thead th") のテキスト配列
 *     (2) 行ごとにセルを配列で取る: $("table tbody tr") を1行ずつ処理、
 *                                  各行の中で $(tr).find("td") のテキスト配列
 *     (3) 見出しと行を対応づける:   headers[i] と row[i] を組にしてRecordを作る
 *
 *   (2)で「行の中のtdを探す」ときは `$(tr).find("td")` のように、
 *   すでに選んだ1つの要素を起点に絞り込む(全体からではなく、その行の中だけを探す)
 *   のがポイント。これを忘れて `$("td")` と書くと、他の行のセルまで
 *   全部混ざってしまう典型的なミスになる。
 * ===================================================================== */

import * as cheerio from "cheerio";

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

// このレッスンで使う題材HTML(演習の data/table_stats.html の縮小版)
const TABLE_HTML = `<table>
  <thead>
    <tr><th>月</th><th>来店者数</th></tr>
  </thead>
  <tbody>
    <tr><td>4月</td><td>320</td></tr>
    <tr><td>5月</td><td>410</td></tr>
  </tbody>
</table>`;

const $ = cheerio.load(TABLE_HTML);

// --- 見る(worked example) ---------------------------------------------
// GOAL: thead/tbodyからヘッダーと行データを取り出し、Recordに組み立てる流れを見る

// STEP 1: 見出し行のテキストを配列にする。
const headers = $("table thead th").map((_, el) => $(el).text()).get();
console.log("--- STEP 1: 見出し ---");
console.log(headers);

// STEP 2: 1行分のtd要素を取り出す(2行あるうちの1行目=最初のtr)。
//         $(tr).find("td") のように「行の中だけ」を探すのがポイント。
const firstRow = $("table tbody tr").get(0)!;
const firstCells = $(firstRow).find("td").map((_, el) => $(el).text()).get();
console.log("--- STEP 2: 1行目のセル ---");
console.log(firstCells);

// STEP 3: 見出しと行データを対応づけてRecordにする。
const record: Record<string, string> = {};
headers.forEach((header, i) => {
  record[header] = firstCells[i];
});
console.log("--- STEP 3: Recordに変換 ---");
console.log(record);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは全行(2行)を同じ手順でRecordの配列に変換します。
// 実行する前に予測: 何件のRecordができるでしょう?
//
// ※重要な罠: cheerio の .map() は「コールバックが配列を返すと1段フラット化する」
//   (jQuery 由来の仕様)。だから行→セル配列の二重変換で外側にも .map() を使うと
//   2次元配列が壊れて全セルが1列に混ざる。外側は .toArray() で素のJS配列にしてから
//   Array.prototype.map を使うのが定石(次の行がその形)。
console.log("--- 予測してみよう ---");
const allRecords = $("table tbody tr").toArray().map((tr) => {
  const cells = $(tr).find("td").map((_i, td) => $(td).text()).get();
  const rec: Record<string, string> = {};
  headers.forEach((header, i) => { rec[header] = cells[i]; });
  return rec;
});
console.log(allRecords);

// --- 変えてみる ---------------------------------------------------------
// $(tr).find("td") の代わりにうっかり $("td") と書くとどうなるか見ておく。
// (行を起点にせず文書全体からtdを探してしまい、他の行のセルまで混ざる)
console.log("--- 変えてみる(悪い例) ---");
const wrongCells = $("td").map((_, el) => $(el).text()).get();
console.log("$(\"td\") だと全行分が混ざる:", wrongCells, "(4個 = 2行×2列ぶん)");

// --- 書いてみる ---------------------------------------------------------
// 課題: TABLE_HTML の2行目(5月)を Record<string, string> にして
//       result2 に入れてください(期待値: { "月": "5月", "来店者数": "410" })。
// ヒント(概念レベル): $("table tbody tr").get(1) で2行目の要素を取り、
//   STEP 2〜3 と同じ手順(find("td")でセル配列→headersと対応づけ)を繰り返す。
let result2: Record<string, string> | null = null;
// ここに書く(result2 に代入する)

check("概念2: 2行目をRecord化", result2, { 月: "5月", 来店者数: "410" },
  '$("table tbody tr").get(1) の行に対し find("td") でセルを取り、headers.forEach で組み立てる');

export {};

/* =====================================================================
 * 次: lesson/03_records_and_defensive_access.ts へ。
 * 欠損セル・class揺れへの防御的アクセスを学ぶ。
 * ===================================================================== */
