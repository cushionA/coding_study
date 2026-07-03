/* =====================================================================
 * 概念1: ページネーションを辿る — 「次へ」リンクを追う while ループと訪問済み Set
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここは総仕上げ(キャップストーン)ユニット。unit01〜05 で1枚ずつ学んだ部品を、
 *   実務のスクレイパーと同じ「1本のパイプライン」に組み上げます。まず全体地図:
 *
 *     [1 取得]        [2 解析]         [3 整形]          [4 出力]
 *     fetchLocal   →  cheerio      →  クレンジング   →  CSVライタ
 *     (unit04)        セレクタ         stripLabel        writeCatalogCsv
 *                     (unit02/03)      priceToNumber     (unit05)
 *                                      (unit05)
 *        ↑                                                    ↑
 *        └── マナー層(robots.txt / Crawl-delay の sleep, unit04)が全体を包む ──┘
 *
 *   ただし実務では「1ページ分の解析」で終わりません。商品一覧はページ分割
 *   (ページネーション)されているので、まず「全ページを辿って全リンクを集める」
 *   工程が [1 取得] の前段に入ります。この概念1ではそこを扱います。
 *
 * ■ 解説:
 *   一覧ページには2種類のリンクがあります:
 *     ・商品の詳細ページへのリンク(class="product-link")… これを全部集めたい
 *     ・「次のページ」へのリンク(class="next-page")   … これを辿って先へ進む
 *
 *   件数(=ページ数)は事前に分かりません。だから for ではなく while で回します:
 *     「次ページURLが null になるまで取得し続ける」。C# で言えば、
 *     次ノードが null になるまで連結リストを辿る while (node != null) と同じ形です。
 *
 *   もう一つの道具が「訪問済み Set」。C# の HashSet<string> と同じで、
 *   すでに見たURLを覚えておき、同じページへ戻る循環(A→B→A→…)で無限ループに
 *   陥るのを防ぎます。演習のフィクスチャは 1→2→3→終わり の一方向なので
 *   厳密には無くても動きますが、本物のサイトはリンクが循環しがちなので、
 *   「巡回=訪問済み管理」をここで手に馴染ませておきます
 *   (演習 ex01 は一方向前提なので Set 無しの簡略版でも通ります)。
 *
 *   cheerio の復習(unit02/03):
 *     cheerio.load(html)      HTML文字列をDOMツリーに変換(C#でXMLを読み込む感覚)
 *     $("a.product-link")     class="product-link" の <a> を全部選ぶCSSセレクタ
 *     .each((i, el) => {...})  選んだ要素を1つずつ処理(LINQのForEach)
 *     $(el).attr("href")       その要素の href 属性。無ければ undefined
 * ===================================================================== */

// check ヘルパー(全 lesson ファイル共通・先頭に配置)
// 未記入(null)でも例外で止めず [NG]+ヒントを出す。
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

import * as cheerio from "cheerio";

// このレッスンは cwd に依存しないよう、2ページだけの縮小版サイトを
// スクリプト内リテラルとして持ちます(演習は data/site/ の3ページ版)。
// 本物では fetchLocal(url) がネットから取ってきた文字列がこの中身に相当します。
const BASE_URL = "https://polaris-coffee.example/";

const PAGE_1 = `<!DOCTYPE html><html><body>
  <div class="product-grid">
    <a class="product-link" href="item_1.html">エチオピア モカ</a>
    <a class="product-link" href="item_2.html">ブラジル サントス</a>
  </div>
  <nav class="pagination">
    <a class="next-page" href="page_2.html">次のページ</a>
  </nav>
</body></html>`;

const PAGE_2 = `<!DOCTYPE html><html><body>
  <div class="product-grid">
    <a class="product-link" href="item_3.html">グアテマラ アンティグア</a>
  </div>
  <nav class="pagination">
    <span class="current-page">2</span>
  </nav>
</body></html>`;

// 2ページ版のローカルフェッチャ。URL末尾のファイル名でページを引く。
// (演習の fetchLocal と同じ「URL→ローカルHTML」の役割。async にしておくのは
//  本物の fetch(url) と差し替え可能な同じシグネチャに揃えるため。)
async function fetchLocal(url: string): Promise<string> {
  const filename = url.split("/").pop();
  if (filename === "page_2.html") return PAGE_2;
  return PAGE_1;
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「1ページから詳細URLを集める」「次ページURLを取り出す」「巡回で全部つなぐ」
//       の3段を、実際に動かして目で見る

// STEP 1: 1ページ分の詳細リンクを集める。href を BASE_URL と連結して絶対URLにする。
//         (相対 "item_1.html" のままでは後で取得できないため)
function extractItemLinks(listHtml: string): string[] {
  const $ = cheerio.load(listHtml);
  const links: string[] = [];
  $("a.product-link").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(BASE_URL + href);  // undefined を弾いてから連結
  });
  return links;
}
console.log("--- STEP 1: 1ページ目の詳細URL ---");
console.log(extractItemLinks(PAGE_1));

// STEP 2: 次ページURLを取り出す。無ければ null を返す(= 巡回の終了合図)。
//         attr("href") は string | undefined。三項で null に正規化しておくと、
//         呼ぶ側は「null かどうか」だけ気にすればよくなる。
function extractNextPageUrl(listHtml: string): string | null {
  const $ = cheerio.load(listHtml);
  const href = $("a.next-page").attr("href");
  return href ? BASE_URL + href : null;
}
console.log("--- STEP 2: 次ページURL ---");
console.log("PAGE_1 の次:", extractNextPageUrl(PAGE_1));  // 2ページ目のURL
console.log("PAGE_2 の次:", extractNextPageUrl(PAGE_2));  // null(最終ページ)

// STEP 3: while で巡回して全ページの詳細URLを1本に連結する。
//         訪問済み Set(C#の HashSet<string>)で「同じURLは二度取得しない」を保証。
async function crawlAll(startUrl: string): Promise<string[]> {
  const all: string[] = [];
  const visited = new Set<string>();          // 訪問済み管理(循環対策)
  let current: string | null = startUrl;
  while (current !== null && !visited.has(current)) {
    visited.add(current);                     // これから取得するURLを記録
    const html = await fetchLocal(current);
    all.push(...extractItemLinks(html));      // ...(スプレッド)で配列を平らに連結
    current = extractNextPageUrl(html);       // 次が null ならループ終了
  }
  return all;
}
console.log("--- STEP 3: 全ページ巡回の結果 ---");
console.log(await crawlAll(BASE_URL + "page_1.html"));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、最終ページ(PAGE_2)から巡回を始めます。
// 実行する前に予測: PAGE_2 には next-page が無い(= extractNextPageUrl は null)。
//   この場合 while ループは何周して、いくつのURLが集まるでしょう?
console.log("--- 予測してみよう ---");
console.log("最終ページから開始:", await crawlAll(BASE_URL + "page_2.html"));

// --- 変えてみる ---------------------------------------------------------
// もし訪問済み Set が無かったら? を体感するため、わざと循環するページを作る。
// loopA の next は loopB、loopB の next は loopA … と互いを指し合う。
// Set があるおかげで、各ページを1回ずつ見たら止まる(無限ループにならない)。
const LOOP_A = `<body><a class="product-link" href="x1.html">X1</a>
  <a class="next-page" href="loop_b.html">B</a></body>`;
const LOOP_B = `<body><a class="product-link" href="x2.html">X2</a>
  <a class="next-page" href="loop_a.html">A</a></body>`;
async function fetchLoop(url: string): Promise<string> {
  return url.endsWith("loop_b.html") ? LOOP_B : LOOP_A;
}
async function crawlWithGuard(startUrl: string): Promise<string[]> {
  const all: string[] = [];
  const visited = new Set<string>();
  let current: string | null = startUrl;
  while (current !== null && !visited.has(current)) {
    visited.add(current);
    const html = await fetchLoop(current);
    const $ = cheerio.load(html);
    $("a.product-link").each((_, el) => { const h = $(el).attr("href"); if (h) all.push(h); });
    const nx = $("a.next-page").attr("href");
    current = nx ? BASE_URL + nx : null;
  }
  return all;
}
console.log("--- 変えてみる ---");
console.log("循環ページでも止まる:", await crawlWithGuard(BASE_URL + "loop_a.html"));

// --- 書いてみる ---------------------------------------------------------
// 課題: STEP 1〜3 を参考に、開始URLから巡回して「全ページの詳細URL」を集める
//       関数を自分で書き、その結果を result1 に入れてください。
//       (BASE_URL + "page_1.html" から始めると、item_1〜item_3 の3件が集まる)
//       期待値: [
//         "https://polaris-coffee.example/item_1.html",
//         "https://polaris-coffee.example/item_2.html",
//         "https://polaris-coffee.example/item_3.html",
//       ]
// ヒント(概念レベル): STEP 3 の while(current !== null) 巡回そのもの。
//   fetchLocal で取得 → extractItemLinks で詰める → extractNextPageUrl で次へ。
//   訪問済み Set は付けても付けなくてもこのフィクスチャなら通る(付ける練習を推奨)。
let result1: string[] | null = null;
// ここに書く(result1 に代入する)

check("概念1: 全ページ巡回", result1, [
  "https://polaris-coffee.example/item_1.html",
  "https://polaris-coffee.example/item_2.html",
  "https://polaris-coffee.example/item_3.html",
], "while (current !== null) で回し、extractItemLinks の結果を all.push(...links)。current = extractNextPageUrl(html) で更新");

export {};
