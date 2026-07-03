/* =====================================================================
 * 概念2: .each() での反復 と .first()/.eq() での1件選択
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ナビゲーションのリンク一覧や商品カードの一覧など、「同じセレクタに
 *   複数マッチする」場面は実務で非常に多い。それぞれを1件ずつ取り出して
 *   配列にまとめる操作は、スクレイピングの中心作業そのものだ。
 *
 * ■ 解説:
 *   $("li") のようなセレクタは複数要素にマッチする「コレクション」を返す。
 *   これを1件ずつ処理するには .each() を使う。C#の foreach に相当するが、
 *   コールバック関数を渡す書き方になる点はLINQの .ToList().ForEach(...) に近い:
 *
 *     $("li").each((index, element) => { ... });
 *
 *   ここで element は素の DOM ノード(cheerioがラップする前の型)なので、
 *   中でテキストや属性を取りたい場合は $(element) として再度 $ に包み直す
 *   必要がある(このひと手間がcheerio特有の癖)。
 *
 *   1件だけ欲しいときは .first()(最初の1件、C#の .First() に相当)や
 *   .eq(番号)(0始まりでn番目、C#の .ElementAt(n) に相当)が使える。
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

// このレッスンで題材にするHTML(演習の data/link_list.html のナビ部分)。
const NAV_HTML = `<nav class="site-nav">
    <ul class="nav-list">
        <li><a href="/" class="nav-link">トップ</a></li>
        <li><a href="/books" class="nav-link">蔵書一覧</a></li>
        <li><a href="/event" class="nav-link">読書会</a></li>
    </ul>
</nav>`;

const $ = cheerio.load(NAV_HTML);

// --- 見る(worked example) ---------------------------------------------
// GOAL: .each() で複数要素を1件ずつ処理し、配列に集める流れを見る

// STEP 1: .each() はコレクションの各要素に対してコールバックを呼ぶ。
//         コールバックの第1引数はインデックス(0始まり)、第2引数は素のDOM要素。
console.log("--- STEP 1 ---");
$(".nav-link").each((index, element) => {
  console.log(`要素${index}:`, element.tagName);  // 素のDOM要素は tagName などを直接持つ
});

// STEP 2: 要素からテキストを取りたい場合は $(element) と再度包む。
//         こうすると .text() / .attr() などcheerioのメソッドが使えるようになる。
console.log("--- STEP 2 ---");
$(".nav-link").each((index, element) => {
  const label = $(element).text();
  console.log(`要素${index}のテキスト:`, label);
});

// STEP 3: .each() の中で配列に push すれば、C#の foreach + List<T>.Add と
//         同じパターンで結果を集められる。
console.log("--- STEP 3 ---");
const labels: string[] = [];
$(".nav-link").each((_index, element) => {
  labels.push($(element).text());
});
console.log("集めたラベル:", labels);

// STEP 4: .first() は最初の1件だけのコレクションを返す。
console.log("--- STEP 4 ---");
console.log(".first()のテキスト:", $(".nav-link").first().text());

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは $(".nav-link").eq(1) のテキストを表示します。
// eq は 0 始まりのインデックスで指定した1件を取り出します。
// 実行する前に予測: どのリンクのテキストが表示されるでしょう?
console.log("--- 予測してみよう ---");
console.log(".eq(1)のテキスト:", $(".nav-link").eq(1).text());

// --- 変えてみる ---------------------------------------------------------
// .length でマッチした件数も確認できる(C#の .Count() に相当)。
console.log("--- 変えてみる ---");
console.log(".nav-linkの件数:", $(".nav-link").length);

// --- 書いてみる ---------------------------------------------------------
// 課題: NAV_HTML から .nav-link のテキストをすべて出現順に配列で集めて
//       result2 に入れてください(期待値: ["トップ", "蔵書一覧", "読書会"])。
// ヒント(概念レベル): STEP 3 と同じ「空配列を用意して .each() の中で push」の形。
let result2: string[] | null = null;
// ここに書く(result2 に代入する)

check("概念2: ナビリンクのテキスト一覧", result2, ["トップ", "蔵書一覧", "読書会"],
  '空配列を用意し $(".nav-link").each((_i, el) => { 配列.push($(el).text()); })');

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */
