/* =====================================================================
 * 概念3: 小さな関数を合成する — オーケストレーターと1件失敗しても止めない設計
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここまでで部品が揃いました:巡回(概念1)/マナー判定と sleep 注入(概念2)/
 *   そして unit02〜05 の 解析・クレンジング・CSV出力。最後の仕事は、これらを
 *   1本のパイプラインに「合成」することです。実務のスクレイパーは、この合成の
 *   仕方(誰を・どの順で・何を渡して呼ぶか)がそのまま保守性を決めます。
 *
 * ■ 解説:
 *   ● 大きな1関数 vs 小さな関数の合成
 *     全部を1つの巨大関数に書くこともできますが、テストも修正も難しくなります。
 *     代わりに「1つのことだけする小さな関数」を並べ、それらを呼ぶだけの
 *     オーケストレーター関数 runPipeline を最後に1つ置きます:
 *
 *       runPipeline = robots判定 → 巡回で全URL収集 → 1件ずつ取得&整形 → CSV出力
 *
 *     runPipeline は各工程の中身を知りません。C# で言えば、複数のサービスクラス
 *     (RobotsChecker / LinkCollector / DetailFetcher / CsvWriter)を順に呼ぶ
 *     アプリケーションサービス(ユースケース)クラスに相当します。
 *
 *   ● 1件が壊れても全体を止めない
 *     10件のうち1件の詳細ページが取得失敗しても、残り9件は出力したい。だから
 *     取得&整形は try/catch で囲み、失敗した1件は「スキップして onError に通知」します。
 *     C# の try { ... } catch (Exception ex) { log(ex); continue; } と同じ発想です。
 *     onError は「失敗をどう扱うか」を呼ぶ側に委ねるためのコールバック(省略可)。
 *
 *   ● クレンジングの復習(unit05)
 *     stripLabel("産地: エチオピア") → "エチオピア"   ("ラベル: 値" から値だけ)
 *     priceToNumber("1200円")       → 1200            (数字以外を除去して Number 化)
 *     これらも「1つのことだけする小さな関数」。合成して cleanItem を作ります。
 * ===================================================================== */

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

const BASE_URL = "https://polaris-coffee.example/";

// 縮小版:詳細ページ2件ぶんのHTML(item_1 は正常、item_2 も正常)。
const ITEM_1 = `<body>
  <h1 class="item-name">エチオピア モカ</h1>
  <p class="item-price">1,200円</p>
  <p class="item-origin">産地: エチオピア</p>
  <p class="item-roast">焙煎度: 浅煎り</p>
  <p class="item-stock">在庫あり</p>
</body>`;
const ITEM_2 = `<body>
  <h1 class="item-name">ブラジル サントス</h1>
  <p class="item-price">980円</p>
  <p class="item-origin">産地: ブラジル</p>
  <p class="item-roast">焙煎度: 中煎り</p>
  <p class="item-stock">在庫わずか</p>
</body>`;

// item_1/item_2 は返し、それ以外(欠番URL)は fs 例外に見立てて throw する。
async function fetchLocal(url: string): Promise<string> {
  const name = url.split("/").pop();
  if (name === "item_1.html") return ITEM_1;
  if (name === "item_2.html") return ITEM_2;
  throw new Error(`404 not found: ${url}`);  // 取得失敗を再現
}

// --- 部品(unit02〜05 で学んだものの縮小再掲) --------------------------
type CleanItem = { id: number; name: string; price: number; origin: string; roast: string; stock: string };

function parseItemDetail(html: string): { name: string; price: string; origin: string; roast: string; stock: string } {
  const $ = cheerio.load(html);
  return {
    name: $(".item-name").text(),
    price: $(".item-price").text(),
    origin: $(".item-origin").text(),
    roast: $(".item-roast").text(),
    stock: $(".item-stock").text(),
  };
}
function stripLabel(text: string): string {
  const idx = text.indexOf(":");
  return idx === -1 ? text : text.slice(idx + 1).trim();
}
function priceToNumber(priceText: string): number {
  return Number(priceText.replace(/[^0-9]/g, ""));  // 数字以外(円・カンマ)を除去
}
function cleanItem(id: number, raw: ReturnType<typeof parseItemDetail>): CleanItem {
  return {
    id,
    name: raw.name,
    price: priceToNumber(raw.price),
    origin: stripLabel(raw.origin),
    roast: stripLabel(raw.roast),
    stock: raw.stock,
  };
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「小さな部品の合成」と「1件失敗しても止めないループ」を目で見る

// STEP 1: 部品を1件に合成する。取得→解析→整形 を1本の流れにつなぐ。
console.log("--- STEP 1: 1件を取得→解析→整形 ---");
const raw1 = parseItemDetail(await fetchLocal(BASE_URL + "item_1.html"));
console.log("解析(生):", raw1);
console.log("整形(clean):", cleanItem(1, raw1));  // price が 1200 に、origin が "エチオピア" に

// STEP 2: 複数URLを1件ずつ処理。途中に「存在しないURL」を混ぜ、try/catch で
//         その1件だけスキップして onError に通知、残りは続行する。
async function fetchAndCleanAll(
  urls: string[],
  onError?: (url: string, error: unknown) => void,
): Promise<CleanItem[]> {
  const results: CleanItem[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const raw = parseItemDetail(await fetchLocal(url));
      results.push(cleanItem(i + 1, raw));    // id は 1 始まりの通し番号
    } catch (error) {
      if (onError) onError(url, error);       // 失敗は握りつぶさず通知(でも止めない)
    }
  }
  return results;
}
console.log("--- STEP 2: 途中に失敗を混ぜても続行 ---");
const errs: string[] = [];
const cleaned = await fetchAndCleanAll(
  [BASE_URL + "item_1.html", BASE_URL + "item_missing.html", BASE_URL + "item_2.html"],
  (url) => errs.push(url),
);
console.log("整形できた件数:", cleaned.length, "(失敗1件はスキップ)");
console.log("スキップしたURL:", errs);

// STEP 3: オーケストレーター。工程を並べて呼ぶだけの「地図」役。
//         ここでは CSV 書き出しの代わりに件数を返す簡易版で「合成の形」を見る。
async function runMiniPipeline(urls: string[]): Promise<CleanItem[]> {
  const rows = await fetchAndCleanAll(urls);  // 収集&整形の工程に丸投げ
  return rows;                                 // 本物はこの後 writeCatalogCsv(rows, path)
}
console.log("--- STEP 3: オーケストレーターの合成 ---");
console.log(await runMiniPipeline([BASE_URL + "item_1.html", BASE_URL + "item_2.html"]));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、全URLが存在しない(全部 fetchLocal が throw する)配列を渡します。
// 実行する前に予測: try/catch で全件スキップされたら、返る配列の長さは?
//   そして onError は何回呼ばれるでしょう?
console.log("--- 予測してみよう ---");
const allFailErrs: string[] = [];
const allFail = await fetchAndCleanAll(
  [BASE_URL + "gone_1.html", BASE_URL + "gone_2.html"],
  (url) => allFailErrs.push(url),
);
console.log("全失敗時の件数:", allFail.length, "/ onError回数:", allFailErrs.length);

// --- 変えてみる ---------------------------------------------------------
// onError を渡さない(省略する)とどうなるか。失敗は静かにスキップされ、
// 例外でプログラムは止まらない(通知だけが無くなる)。
console.log("--- 変えてみる ---");
const silent = await fetchAndCleanAll([BASE_URL + "item_1.html", BASE_URL + "nope.html"]);
console.log("onError省略でも止まらない。取得できた件数:", silent.length);

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の3つのURL(1件目と3件目は存在、2件目は欠番)を fetchAndCleanAll に渡し、
//       「整形できた CleanItem の配列」を result3 に入れてください(onErrorは省略でOK)。
//       id は 1 始まりの通し番号(失敗した2件目のぶんも番号は消費される点に注意:
//       item_1 が id=1、item_2 が id=3)。
//       期待値: [
//         { id: 1, name: "エチオピア モカ", price: 1200, origin: "エチオピア", roast: "浅煎り", stock: "在庫あり" },
//         { id: 3, name: "ブラジル サントス", price: 980,  origin: "ブラジル",   roast: "中煎り", stock: "在庫わずか" },
//       ]
// ヒント(概念レベル): result3 = await fetchAndCleanAll(urls) の1行。
//   await を忘れると Promise がそのまま入って [NG] になる。
const urls = [BASE_URL + "item_1.html", BASE_URL + "item_missing.html", BASE_URL + "item_2.html"];

let result3: CleanItem[] | null = null;
// ここに書く(result3 に代入する。await を忘れずに)

check("概念3: パイプライン合成", result3, [
  { id: 1, name: "エチオピア モカ", price: 1200, origin: "エチオピア", roast: "浅煎り", stock: "在庫あり" },
  { id: 3, name: "ブラジル サントス", price: 980, origin: "ブラジル", roast: "中煎り", stock: "在庫わずか" },
], "let result3 = await fetchAndCleanAll(urls); 欠番の item_missing は自動でスキップされ、id は通し番号(1と3)になる");

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
 * まとめと次へ(unit06 = コース総仕上げ)
 * ---------------------------------------------------------------------
 * 概念              一言で                                         C#で言うと
 * ページネーション  「次へ」を辿る while + 訪問済み Set で全URL収集   while(node!=null)
 * 巡回(概念1)                                                       / HashSet<string>
 * マナー層の分離    isAllowed で可否判定、sleep は関数注入で         IRobotsChecker /
 * (概念2)          テスト時は一瞬に差し替え                         ISleeper のDI
 * パイプライン合成  小さな関数を並べ、runPipeline が順に呼ぶだけ。   サービス層 /
 * (概念3)          1件失敗は try/catch でスキップして続行           ユースケースクラス
 *
 * これで全体地図が1本につながりました:
 *   robots判定(概念2) → 巡回で全URL収集(概念1) →
 *   1件ずつ取得&整形(概念3, unit02〜05) → CSV出力(unit05)
 * = これがスクレイパーの「実務の最小形」です。あとは演習でこの形を自分の手で組みます。
 *
 * この先どこで使うか(演習):
 * ・ex01 で collectAllItemLinks(巡回)、ex02 で parseItemDetail(取得&解析)、
 *   ex03 で cleanItem / writeCatalogCsv(整形&出力)を個別に完成させ、
 *   ex04 で isAllowed + sleep注入 + 巡回 + 整形 + CSV を runPipeline に統合します。
 *   今日 lesson で見た関数は、演習スケルトンのシグネチャとそのまま対応しています。
 *
 * 次のコース候補への接続:
 * ・本物のサイトでは fetchLocal を実 fetch(url) に差し替えるだけで動く設計にしてあります
 *   (だからローカルフェッチャは async で本物と同じ形にしてある)。
 *   次に進むなら「実 HTTP + 認証/クッキー」「JS描画ページ(ヘッドレスブラウザ)」
 *   「大量ページの並行取得(Promise.all と同時実行数の制限)」あたりが自然な発展先です。
 *
 * 演習の実行(cwd は courses/web-scraping-ts/):
 *   npx vitest run unit06-capstone-scraper/tests/ex01.test.ts
 * ===================================================================== */
