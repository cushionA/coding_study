/* =====================================================================
 * 概念3: .attr() で属性を取る — string | undefined という型の現実
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   リンクのURL(href)や画像のsrc、データ属性(data-*)など、属性値を
 *   取り出す場面はテキストを取る場面と同じくらい頻出する。ただし属性は
 *   「そもそも付いていないかもしれない」ため、cheerioの型設計は
 *   .text() とはっきり違う扱いになっている。
 *
 * ■ 解説:
 *   $(element).attr("href") は、属性が存在すれば string、存在しなければ
 *   undefined を返す。つまり戻り値の型は string | undefined という
 *   合併型になる。これはC#の Dictionary<string,string>.TryGetValue() で
 *   見つからなかった場合に近い「見つからないことが型で表現されている」
 *   状態だ(.text() が常にstringを返すのとは対照的)。
 *
 *   undefined かもしれない値を安全に扱うには、unit01で学んだ
 *   ?? (Null合体演算子) がそのまま使える:
 *
 *     const href = $(element).attr("href") ?? "(リンクなし)";
 *
 *   これはC#の `dict.TryGetValue(key, out var v) ? v : "(リンクなし)"` や
 *   `value ?? "(リンクなし)"` と同じ発想。「無ければデフォルト値」を
 *   1行で書ける。
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

// このレッスンで題材にするHTML(演習の data/link_list.html のSNS部分に相当)。
const SNS_HTML = `<ul class="sns-list">
    <li><a href="https://sns.example.test/bookforest" class="sns-link" data-platform="sns-a">SNS-A</a></li>
    <li><a class="sns-link">リンク未設定</a></li>
</ul>`;

const $ = cheerio.load(SNS_HTML);

// --- 見る(worked example) ---------------------------------------------
// GOAL: .attr() が string を返す場合と undefined を返す場合の両方を見る

// STEP 1: 属性が存在する要素から .attr("href") を取る。
console.log("--- STEP 1 ---");
const firstLink = $(".sns-link").first();
console.log("1件目のhref:", firstLink.attr("href"));
console.log("型を確認(typeof):", typeof firstLink.attr("href"));  // "string"

// STEP 2: data-platform のようなデータ属性も同じ .attr("属性名") で取れる。
console.log("--- STEP 2 ---");
console.log("1件目のdata-platform:", firstLink.attr("data-platform"));

// STEP 3: href属性が付いていない要素から取ると undefined になる。
//         例外にはならない点に注意(C#で存在しないキーにアクセスして
//         例外になる Dictionary の Indexer とは違う)。
console.log("--- STEP 3 ---");
const secondLink = $(".sns-link").eq(1);
console.log("2件目のhref:", secondLink.attr("href"));  // undefined
console.log("型を確認(typeof):", typeof secondLink.attr("href"));  // "undefined"

// STEP 4: ?? でデフォルト値にフォールバックする。
console.log("--- STEP 4 ---");
const safeHref = secondLink.attr("href") ?? "(リンクなし)";
console.log("??でフォールバック:", safeHref);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、存在しない属性名 "data-missing" を1件目の要素から取ります。
// 実行する前に予測: 何が表示されるでしょうか?(STEP 3と同じ理屈)
console.log("--- 予測してみよう ---");
console.log("存在しない属性:", firstLink.attr("data-missing"));

// --- 変えてみる ---------------------------------------------------------
// .each() の中で .attr() を使い、undefinedを??で毎回フォールバックしながら
// 配列に集める、という実務でよくあるパターンを確認する。
console.log("--- 変えてみる ---");
const hrefs: string[] = [];
$(".sns-link").each((_i, el) => {
  hrefs.push($(el).attr("href") ?? "(リンクなし)");
});
console.log("全hrefs(フォールバック込み):", hrefs);

// --- 書いてみる ---------------------------------------------------------
// 課題: SNS_HTML の .sns-link をすべて走査し、data-platform 属性の値を
//       集めて result3 に入れてください。属性が無ければ "unknown" とする
//       (期待値: ["sns-a", "unknown"])。
// ヒント(概念レベル): 変えてみるブロックと同じ「.each() + push」の形。
//   $(el).attr("data-platform") ?? "unknown" を push する。
let result3: string[] | null = [];
// ここに書く(result3 に代入する)

$(".sns-link").each((index,element) => {
  result3.push($(element).attr("data-platform")?? "unknown");
})

check("概念3: data-platformの一覧(フォールバック込み)", result3, ["sns-a", "unknown"],
  '$(".sns-link").each((_i, el) => { 配列.push($(el).attr("data-platform") ?? "unknown"); })');

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */
