/* =====================================================================
 * 概念3: 欠損・class揺れへの防御的アクセス
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   実務のHTMLは綺麗とは限りません。ある商品カードには説明文が無かったり、
 *   同じ意味の要素にclass="event"とclass="event-item"が混在していたり、
 *   要素はあっても中身が空文字だったりします。ここで雑に`.text()`を
 *   呼ぶだけのコードは、欠損データに出会った瞬間に空文字やundefinedが
 *   そのままレコードに紛れ込み、後工程(集計・CSV出力)で気づかれずに
 *   データが壊れる原因になります。
 *
 * ■ 解説:
 *   cheerioで要素を探して「見つからない」場合、C#のFirstOrDefaultが
 *   nullを返すのと違い、例外にはならず「長さ0のCheerio集合」が返ります。
 *   これが今日いちばん重要なTS/cheerio特有の挙動:
 *
 *     $(el).find(".title")          → 見つからなくてもエラーにならない
 *     $(el).find(".title").length   → 0 なら「その要素自体が無い」
 *     $(el).find(".title").text()   → 要素が無くても "" (空文字)が返る
 *                                      (例外にならない。C#ならNullReferenceExceptionの場面)
 *
 *   つまり「要素が無い」と「要素はあるが空」の両方を空文字またはlength===0で
 *   判定し、フォールバック値を当てるのが定石です:
 *
 *     const el = $(li).find(".title");
 *     const title = el.length === 0 || el.text() === "" ? "不明" : el.text();
 *
 *   属性値を取る`.attr("href")`はstring | undefinedを返すため、C#のnull条件
 *   演算子と同じ記号の`??`でデフォルト値と組み合わせるのが定石(unit01の
 *   Record集計で使ったのと同じ演算子です):
 *
 *     const href = $(el).attr("href") ?? "(リンクなし)";
 *
 *   class揺れ(event / event-item)には、セレクタのカンマ区切り(OR条件)で
 *   両方を1回のクエリで拾う:
 *
 *     $("li.event, li.event-item")
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

// このレッスンで使う題材HTML(演習の data/messy_list.html の縮小版)
// 1件目: title/dateどちらもある / 2件目: date要素が無い(欠損) /
// 3件目: class名が event-item に揺れている / 4件目: date要素はあるが空文字
const MESSY_HTML = `<ul>
  <li class="event">
    <span class="title">読書会</span>
    <span class="date">2026-07-12</span>
  </li>
  <li class="event">
    <span class="title">ワークショップ</span>
  </li>
  <li class="event-item">
    <span class="title">読み聞かせ会</span>
    <span class="date">2026-07-20</span>
  </li>
  <li class="event">
    <span class="title">トーク</span>
    <span class="date"></span>
  </li>
</ul>`;

const $ = cheerio.load(MESSY_HTML);

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「要素が無い」と「要素はあるが空」をlengthとtext()で見分ける動きを見る

// STEP 1: 2件目(ワークショップ)は.date要素そのものが無い。
const secondLi = $("li.event, li.event-item").get(1)!;
const dateEl = $(secondLi).find(".date");
console.log("--- STEP 1: 存在しない要素 ---");
console.log("length:", dateEl.length, "/ text():", JSON.stringify(dateEl.text()));

// STEP 2: 4件目(トーク)は.date要素はあるが中身が空文字。
const fourthLi = $("li.event, li.event-item").get(3)!;
const dateEl2 = $(fourthLi).find(".date");
console.log("--- STEP 2: 要素はあるが空 ---");
console.log("length:", dateEl2.length, "/ text():", JSON.stringify(dateEl2.text()));

// STEP 3: 両方のケースを1つの三項演算子でまとめて「不明」にフォールバックする。
function safeDate(li: cheerio.Cheerio<any>): string {
  const el = li.find(".date");
  return el.length === 0 || el.text() === "" ? "不明" : el.text();
}
console.log("--- STEP 3: safeDateでまとめて判定 ---");
console.log("2件目:", safeDate($(secondLi)));
console.log("4件目:", safeDate($(fourthLi)));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは class="event" と class="event-item" 両方をカンマ区切りの
// セレクタで一括取得します。実行する前に予測: 何件ヒットするでしょう?
console.log("--- 予測してみよう ---");
const allItems = $("li.event, li.event-item");
console.log("件数:", allItems.length);

// --- 変えてみる ---------------------------------------------------------
// セレクタを "li.event" だけにするとclass揺れの3件目(読み聞かせ会)を
// 取りこぼす。実際に件数が減ることを確認する。
console.log("--- 変えてみる ---");
console.log("li.event のみ:", $("li.event").length, "件(3件目を取りこぼす)");
console.log("カンマ区切り :", $("li.event, li.event-item").length, "件");

// --- 書いてみる ---------------------------------------------------------
// 課題: MESSY_HTML の3件目(class="event-item"、読み聞かせ会)の.titleテキストを
//       result3 に入れてください(期待値: "読み聞かせ会")。
// ヒント(概念レベル): $("li.event, li.event-item").get(2) で3件目の要素を取り、
//   .find(".title").text() でテキストを取る(この要素はtitleが欠損していないので
//   フォールバックは不要)。
let result3: string | null = null;
// ここに書く(result3 に代入する)

check("概念3: class揺れ要素のtitle", result3, "読み聞かせ会",
  '$("li.event, li.event-item").get(2) で3件目を取り .find(".title").text()');

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
 * CSSセレクタ     class(.foo)・子供結合子(>)・属性([a="b"])・   LINQ to XMLの
 *                 OR(カンマ区切り)を組み合わせて複数要素を一括選択  絞り込みクエリ
 * table抽出       thead th→見出し、tbody tr→行、行ごとにfind("td")  DataTable→
 *                 でセルを取り、headers[i]とrow[i]を対応づけてRecord化  List<Dictionary>
 * 防御的アクセス   .length===0で「要素が無い」、.text()===""で        FirstOrDefaultの
 *                 「あるが空」を判定し、?? や三項演算子でフォールバック  null判定+??
 *
 * この先どこで使うか:
 * ・unit04でfetchによる実際のHTTP取得を学ぶと、今日のtable抽出・防御的アクセスが
 *   「壊れていない前提のフィクスチャ」から「本当に何が返ってくるか分からない
 *   実サイト相当のレスポンス」に対して使われるようになります。
 * ・unit05のCSV出力は、今日作ったArray<Record<string,string>>をそのまま
 *   受け取る形で設計されています。今日の「欠損を落とさず不明で埋める」判断が、
 *   CSVの行がガタガタにならないための土台になります。
 *
 * 次: 演習 ex01_css_select.ts へ。lesson を見ながらで OK。テストは
 *   npx vitest run unit03-selectors-and-tables/tests/ex01.test.ts
 *   (cwd は courses/web-scraping-ts/)
 * ===================================================================== */
