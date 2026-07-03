/* =====================================================================
 * 概念4: .find() / .children() / .parent() — 木を辿るナビゲーション
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   実際のHTMLはフロア案内のように「大枠→中枠→中身」と何段にも入れ子に
 *   なっている。欲しい情報だけを的確に拾うには、「この要素の中だけを
 *   探す」「この要素の直接の子だけを見る」「この要素の親を辿る」という
 *   木構造ならではのナビゲーションが必要になる。
 *
 * ■ 解説:
 *   - $(selector) はドキュメント全体から探す(グローバル検索)。
 *   - element.find(selector) は「その要素の子孫の中だけ」から探す
 *     (C#でXMLの特定ノード配下だけをXPathで探すのに近い、スコープ付き検索)。
 *   - element.children(selector?) は「直接の子だけ」(孫は含まない)。
 *     引数を省略すると全ての直接の子が対象になる。
 *   - element.parent() は「直接の親」を1件返す。
 *
 *   同じクラス名が複数箇所で使い回されるHTML(今回の "section-name" のように
 *   複数のフロアで繰り返される構造)では、$(".section-name") のような
 *   グローバル検索だけでは「どのフロアに属するか」が分からなくなる。
 *   まず外側の要素($(".floor")など)を .each() で回し、その中で
 *   .find() を使ってスコープを絞ることで、「フロアごとに」情報をまとめられる。
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

// このレッスンで題材にするHTML(演習の data/nested.html の1階部分)。
const FLOOR_HTML = `<div class="floor-guide">
    <div class="floor" data-floor="1">
        <h2 class="floor-name">1階</h2>
        <div class="section">
            <span class="section-name">新刊コーナー</span>
        </div>
        <div class="section">
            <span class="section-name">文芸コーナー</span>
        </div>
    </div>
</div>`;

const $ = cheerio.load(FLOOR_HTML);

// --- 見る(worked example) ---------------------------------------------
// GOAL: find/children/parent でスコープを絞りながら木を辿る流れを見る

// STEP 1: グローバルに $(".section-name") で探すと、このHTMLでは2件ヒットする。
console.log("--- STEP 1 ---");
console.log("グローバル検索の件数:", $(".section-name").length);

// STEP 2: まず外側の .floor を掴み、その中だけを .find() でスコープを絞って探す。
//         書き方は $(".floor").find(".floor-name") のように、コレクションに
//         対して直接 .find() を呼べる。
console.log("--- STEP 2 ---");
const floor = $(".floor");
const floorName = floor.find(".floor-name").text();
console.log("このfloor内のfloor-name:", floorName);

// STEP 3: .children() は直接の子だけを返す(孫は対象外)。
//         floor の直接の子は h2.floor-name と div.section が2つ。
console.log("--- STEP 3 ---");
console.log("floorの直接の子の数:", floor.children().length);
console.log("floorの直接の子(.sectionのみ)の数:", floor.children(".section").length);

// STEP 4: .parent() で親要素に戻れる。
//         section-name の要素から親を辿ると .section が取れる。
console.log("--- STEP 4 ---");
const firstSectionName = $(".section-name").first();
const parentClass = firstSectionName.parent().attr("class");
console.log("section-nameの親のclass:", parentClass);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、.floor の中で .section を .each() で回し、それぞれの
// section-name テキストを配列に集めます。
// 実行する前に予測: 何件、どんな順番で集まるでしょうか?
console.log("--- 予測してみよう ---");
const sectionNames: string[] = [];
floor.find(".section").each((_i, el) => {
  sectionNames.push($(el).find(".section-name").text());
});
console.log("集めたsection名:", sectionNames);

// --- 変えてみる ---------------------------------------------------------
// find は「子孫すべて」から探すためネストの深さを気にしなくてよい一方、
// children は「直接の子のみ」なので構造が変わると結果も変わる。
// floor.children(".section-name") は直接の子ではないため 0 件になることを確認する。
console.log("--- 変えてみる ---");
console.log("floor.children('.section-name')の件数(直接の子ではないので0):",
  floor.children(".section-name").length);

// --- 書いてみる ---------------------------------------------------------
// 課題: floor の中の .section をすべて .each() で回し、各 section の
//       中の .section-name テキストを配列に集めて result4 に入れてください
//       (期待値: ["新刊コーナー", "文芸コーナー"])。
// ヒント(概念レベル): 予測してみようブロックとほぼ同じ形。
//   floor.find(".section") で.sectionを集め、.each()の中でさらに
//   $(el).find(".section-name").text() を取って push する。
let result4: string[] | null = null;
// ここに書く(result4 に代入する)

check("概念4: section名の一覧", result4, ["新刊コーナー", "文芸コーナー"],
  'floor.find(".section").each((_i, el) => { 配列.push($(el).find(".section-name").text()); })');

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
 * 概念            一言で                                       C#で言うと
 * cheerio.load    HTML文字列を $ というクエリ関数に変換。       XDocument.Parse
 *                 unit01の素朴な文字列処理をパーサに任せる
 * $(セレクタ)     CSSセレクタで要素のコレクションを取得。       XPath/LINQ to XML
 *                 .text() は常にstringを返す(空文字列で安全)
 * .each()         コレクションを1件ずつ処理。中では $(element)   foreach +
 *                 と包み直してからtext/attrを呼ぶ                List<T>.Add
 * .attr()         属性値はstring|undefined。無ければundefined。 TryGetValue /
 *                 ??でフォールバックするのが定石                  Dictionary
 * find/children/  find=子孫全体、children=直接の子のみ、          XPath descendant
 * parent          parent=直接の親。スコープを絞って探索できる      / child / parent
 *
 * この先どこで使うか:
 * ・unit03では $() に渡すCSSセレクタ自体をもっと複雑にし(子孫セレクタ、
 *   属性セレクタ、:nth-child等)、table構造やカードの繰り返しを一気に
 *   Array<Record<string,string>> へ変換する練習をする。
 * ・.attr() が undefined を返すケースへの防御的アクセスは、unit03の
 *   「欠損セル・不揃いな行」への対応でそのまま活きる。
 *
 * 次: 演習 ex01_query_basic.ts へ。lesson を見ながらで OK。テストは
 *   npx vitest run unit02-cheerio-basics/tests/ex01.test.ts
 *   (cwd は courses/web-scraping-ts/)
 * ===================================================================== */
