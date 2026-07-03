/* =====================================================================
 * 概念1: CSSセレクタで複数レコードを一括抽出する
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit02では$("h1")のような単純なタグ名セレクタしか使っていません。
 *   実務のページは同じ構造の要素(商品カード・記事一覧)が何十件も並ぶので、
 *   「class名・親子関係・属性」を組み合わせて狙った要素の集合だけを
 *   一発で選び出す力が必須です。ここを雑にやると、隣の無関係な要素まで
 *   拾ってしまうバグの温床になります。
 *
 * ■ 解説:
 *   CSSセレクタの主要パーツ(C#にはこの概念自体が無いので、そのまま新しい構文として覚える):
 *
 *     div.item          → class="item" を持つ div (タグ名+クラス)
 *     div.item > span    → div.item の「直接の子」である span (子供結合子 >)
 *     div.item span      → div.item の「子孫すべて」である span (半角スペース = 子孫結合子)
 *     div[data-stock="in"] → data-stock属性が"in"のdiv (属性セレクタ)
 *     a.tag, a.link       → a.tag または a.link のどちらか(カンマ区切りでOR条件)
 *
 *   `>`(直接の子だけ)と半角スペース(子孫すべて)の違いは特に間違えやすい。
 *   「孫要素まで拾ってしまって重複する」バグの多くはこの取り違えが原因です。
 *
 *   複数要素を選んだあとテキストの配列にする定石:
 *     $(selector).map((i, el) => $(el).text()).get()
 *   `.map()` はcheerio独自の集合(Cheerio<Element>)を返すので、普通のJS配列に
 *   戻すために最後に `.get()` を呼ぶのを忘れないこと(C#のLINQに`.ToList()`が
 *   要るのと似た感覚)。
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

// このレッスンで使う題材HTML(演習の data/products.html の縮小版)
const PRODUCTS_HTML = `<div class="product-grid">
  <div class="item" data-stock="in">
    <span class="name">星めぐりの記憶</span>
    <span class="price">1800</span>
  </div>
  <div class="item" data-stock="out">
    <span class="name">古書修繕の手引き</span>
    <span class="price">2400</span>
  </div>
  <div class="item" data-stock="in">
    <span class="name">海辺の図書館</span>
    <span class="price">1500</span>
  </div>
</div>`;

const $ = cheerio.load(PRODUCTS_HTML);

// --- 見る(worked example) ---------------------------------------------
// GOAL: class・子供結合子・属性セレクタで狙った要素だけを選ぶ動きを見る

// STEP 1: class名で選ぶ。div.item は「class="item"を持つdiv」すべてに一致する。
console.log("--- STEP 1: div.item の件数 ---");
console.log($("div.item").length);

// STEP 2: 子供結合子 > で「直接の子」だけに絞る。
//         div.item > span.name は「div.itemの直接の子であるspan.name」。
const names = $("div.item > span.name").map((_, el) => $(el).text()).get();
console.log("--- STEP 2: 商品名一覧 ---");
console.log(names);

// STEP 3: 属性セレクタで絞り込む。[data-stock="in"] で在庫ありだけに限定する。
const inStockCount = $('div.item[data-stock="in"]').length;
console.log("--- STEP 3: 在庫ありの件数 ---");
console.log(inStockCount);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは div.item[data-stock="in"] span.price のテキストを集めます。
// 実行する前に予測: 何件・どんな値が返るでしょう?(在庫ありは3件中2件)
console.log("--- 予測してみよう ---");
const inStockPrices = $('div.item[data-stock="in"] span.price').map((_, el) => $(el).text()).get();
console.log("在庫ありの価格:", inStockPrices);

// --- 変えてみる ---------------------------------------------------------
// div.item span.name (子孫結合子=半角スペース)と div.item > span.name (子供結合子)
// を比べる。この題材では span.name が div.item の直接の子なので結果は同じになるが、
// もし span.name がさらに入れ子の中にあった場合、子孫セレクタは拾ってしまい
// 子供結合子は拾わない、という違いが出る。
console.log("--- 変えてみる ---");
console.log("子孫結合子:", $("div.item span.name").map((_, el) => $(el).text()).get());
console.log("子供結合子:", $("div.item > span.name").map((_, el) => $(el).text()).get());

// --- 書いてみる ---------------------------------------------------------
// 課題: PRODUCTS_HTML から、在庫切れ(data-stock="out")の商品名だけを
//       配列にして result1 に入れてください(期待値: ["古書修繕の手引き"])。
// ヒント(概念レベル): STEP 3 の属性セレクタと STEP 2 の子供結合子を組み合わせる。
let result1: string[] | null = null;
// ここに書く(result1 に代入する)

check("概念1: 在庫切れの商品名", result1, ["古書修繕の手引き"],
  '$(\'div.item[data-stock="out"] > span.name\').map((_, el) => $(el).text()).get()');

export {};

/* =====================================================================
 * 次: lesson/02_table_extraction.ts へ。tableをArray<Record>に変換する方法を学ぶ。
 * ===================================================================== */
