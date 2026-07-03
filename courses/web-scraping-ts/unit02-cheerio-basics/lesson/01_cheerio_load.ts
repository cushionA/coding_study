/* =====================================================================
 * 概念1: cheerio.load() — HTML文字列を「クエリできるオブジェクト」に変える
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit01では indexOf/slice でHTMLを手作業で切り出した。タグの書き方が
 *   少し変わる(属性の順番が変わる、改行が入る)だけで壊れる素朴さを体感した
 *   はずだ。cheerioはHTMLを「タグの入れ子構造(DOM)」として正しく読み込み、
 *   jQuery風の $(セレクタ) で欲しい要素を探せるようにするライブラリ。
 *   実務のスクレイパーはほぼ例外なくcheerio(またはjQuery系API)を使う。
 *
 * ■ 解説:
 *   cheerio.load(html) はHTML文字列を受け取り、$ という「クエリ関数」を
 *   返す。C#で言えば、XML文字列を XDocument.Parse() でパースして
 *   XDocument オブジェクトを得るのに近い。以後は文字列ではなく、この
 *   $ を通してタグを「オブジェクトとして」探す。
 *
 *   $("h1") は「ページ中のすべての<h1>要素」を表す Cheerio<Element> という
 *   コレクションを返す(1個でも0個でも複数でも、常にコレクション)。
 *   そこから .text() を呼ぶと中のテキストが文字列で返る。
 *
 *   TypeScript固有の注目点: .text() の戻り値は常に string 型。
 *   要素が見つからなくても例外にはならず、空文字列 "" が返る
 *   (C#の LINQ で該当なしのとき例外を投げる First() とは違い、
 *   空文字列という「値」で返ってくる点に要注意)。
 * ===================================================================== */

import * as cheerio from "cheerio";

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

// このレッスンで題材にするHTML(演習の data/blog_post.html の縮小版)。
const BLOG_HTML = `<!DOCTYPE html>
<html lang="ja">
<body>
    <article class="post">
        <h1 class="post-title">古書コーナー、2階に新設しました</h1>
        <p class="post-meta">著者: 佐藤 涼太 / 投稿日: 2026-11-03</p>
        <div class="post-body">
            <p>長らくご要望をいただいていた古書コーナーを、ついに2階に新設しました。</p>
            <p>掘り出し物の文庫本から、絶版になった専門書まで幅広く取り揃えています。</p>
        </div>
    </article>
</body>
</html>`;

// --- 見る(worked example) ---------------------------------------------
// GOAL: cheerio.load() で $ を得て、セレクタでテキストを取り出す流れを見る

// STEP 1: cheerio.load(html) は $(セレクタ) というクエリ関数を返す。
//         以後この $ を通してHTMLを探索する。
const $ = cheerio.load(BLOG_HTML);
console.log("--- STEP 1: $ が使えるようになった ---");
console.log(typeof $);  // "function"

// STEP 2: $("セレクタ") はマッチする要素のコレクションを返す。
//         .text() でその中のテキストをすべて連結した文字列を取り出せる。
const title = $("h1").text();
console.log("--- STEP 2 ---");
console.log("h1のテキスト:", title);

// STEP 3: クラス名でも探せる(CSSセレクタと同じ書き方: ".クラス名")。
//         C#でXMLをXPathで探すのに近い感覚だが、記法はCSSセレクタ。
const meta = $(".post-meta").text();
console.log("--- STEP 3 ---");
console.log(".post-metaのテキスト:", meta);

// STEP 4: 見つからないセレクタを渡しても例外にならず、
//         .text() は空文字列 "" を返す(unit01のindexOfが-1を返すのと似た安全設計)。
const missing = $(".no-such-class").text();
console.log("--- STEP 4 ---");
console.log("存在しないクラス:", JSON.stringify(missing), "(空文字列)");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは $(".post-body") のテキストを表示します。
// .post-body の中には <p> が2つネストされています。
// 実行する前に予測: .text() は中の2つの<p>のテキストをどう扱うでしょうか?
console.log("--- 予測してみよう ---");
console.log($(".post-body").text());

// --- 変えてみる ---------------------------------------------------------
// セレクタを変えると取れる範囲が変わることを確認する。
// "p" だけだと文書中のすべての<p>(post-metaは<p>ではないので対象外)がまとめて
// 連結される。
console.log("--- 変えてみる ---");
console.log("すべての<p>を連結:", $("p").text());

// --- 書いてみる ---------------------------------------------------------
// 課題: BLOG_HTML から class="post-title" 要素のテキストを取り出して
//       result1 に入れてください(期待値: "古書コーナー、2階に新設しました")。
// ヒント(概念レベル): STEP 3 と同じ形。$(".クラス名").text() の1行。
let result1: string | null = null;
// ここに書く(result1 に代入する)

check("概念1: post-titleのテキスト", result1, "古書コーナー、2階に新設しました",
  '$(".post-title").text() の形');

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */
