/* =====================================================================
 * 概念3: レート制限・Crawl-delay・429/Retry-After と、sleep の注入設計
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   robots.txt で「取ってよい」と分かっても、休みなく連打してよいわけでは
 *   ありません。相手のサーバーは他の利用者にも応答しています。1秒に何十回も
 *   叩けば、相手にとっては小さなDoS攻撃と変わりません。だから「1件取るごとに
 *   少し待つ(レート制限)」のがマナーです。待つ間隔は robots.txt の Crawl-delay
 *   (概念2)で指定されていることもあります。
 *
 *   それでも送りすぎると、サーバーは 429 Too Many Requests を返してきます。
 *   これは「送りすぎ。しばらく待って」という明示的な合図で、多くの場合
 *   Retry-After ヘッダで「何秒待つべきか」まで教えてくれます。これを無視して
 *   連打するのは、スクレイパーが最もやってはいけない挙動です。
 *
 * ■ 解説:
 *   (1) 待つ = sleep。TypeScript には「指定秒だけ待つ」組み込み関数が無いので、
 *       setTimeout を Promise で包んで自作します:
 *
 *         const sleep = (s: number) =>
 *           new Promise<void>((resolve) => setTimeout(resolve, s * 1000));
 *         await sleep(2);   // 2秒待つ
 *
 *       setTimeout(コールバック, ミリ秒) は「指定ミリ秒後にコールバックを呼ぶ」
 *       だけの関数。それを「解決したら次へ進む Promise」に変換すると、await で
 *       待てるようになります。C# の await Task.Delay(2000) とまったく同じ役割です
 *       (Polly のリトライポリシーの中で待つのにも近い)。
 *
 *   (2) sleep の「注入」。この演習/レッスンでは本物の setTimeout で実際に待ちません。
 *       テストで数秒止まると学習体験が悪いのと、「何秒待とうとしたか」だけ検証したい
 *       からです。そこで「待つ処理」を関数の引数として外から渡します(依存性注入。
 *       C# の DI で ISleepService を注入するのと同じ)。型は:
 *
 *         type SleepFunc = (seconds: number) => Promise<void>;
 *
 *       本番では本物の sleep を、テストでは「待たずに秒数を記録するだけの偽 sleep」を
 *       渡す。関数の中身は同じまま、待ち方だけ差し替えられます。
 *
 *   (3) 429 の扱い。response.status が 429 なら Retry-After ヘッダ(概念1で見た
 *       headers.get。無ければ null)を読み、その秒数だけ sleep してから再試行します。
 *
 *   今日のゴールは、この sleep 注入の形と「不足分だけ待つ」計算を手で書けること。
 *   演習 ex03 では、これを使って複数URLを一定間隔で巡回する処理まで完成させます。
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

// 概念1と同じ「Response のミニチュア」。429 応答を作るために使う。
class FakeHeaders {
  private readonly map: Map<string, string>;
  constructor(entries: Record<string, string> = {}) {
    this.map = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  }
  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) ?? null;
  }
}
class FakeResponse {
  readonly status: number;
  readonly headers: FakeHeaders;
  constructor(status: number, headers: Record<string, string> = {}) {
    this.status = status;
    this.headers = new FakeHeaders(headers);
  }
  get ok(): boolean { return this.status >= 200 && this.status < 400; }
}

// 待つ処理の型(依存性注入の受け口)。本番の sleep もテスト用の偽 sleep もこの形。
type SleepFunc = (seconds: number) => Promise<void>;

// --- 見る(worked example) ---------------------------------------------
// GOAL: sleep の作り方、注入、「不足分だけ待つ」計算、429+Retry-After を見る

// STEP 1: 本物の sleep を作る。setTimeout を Promise で包むと await で待てる。
//         ここでは 0.01 秒(10ミリ秒)だけ実際に待って、動くことを確認する。
console.log("--- STEP 1: 本物の sleep ---");
const realSleep: SleepFunc = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));
console.log("待つ前");
await realSleep(0.01);   // 実際に 10ミリ秒待つ
console.log("待った後(await で 0.01 秒待った)");

// STEP 2: テスト用の「偽 sleep」を注入する。実際には待たず、何秒待とうとしたかを記録する。
//         これが依存性注入の狙い: 関数の中身は変えず、待ち方だけ差し替える。
console.log("--- STEP 2: 偽 sleep(注入用) ---");
const waited: number[] = [];
const fakeSleep: SleepFunc = async (s) => { waited.push(s); };  // 待たずに記録だけ
await fakeSleep(2);
await fakeSleep(5);
console.log("待とうとした秒数:", waited);  // [2, 5]。実際には一瞬で終わる

// STEP 3: 「前回から minInterval 秒あける」ための不足分の計算。
//         経過時間 = 今 - 前回。不足 = minInterval - 経過。不足が正なら不足分だけ待つ。
//         これが waitIfNeeded(演習 ex03)の心臓部。sleepFunc を注入して使う。
console.log("--- STEP 3: 不足分だけ待つ ---");
async function waitGap(now: number, last: number, minInterval: number, sleepFunc: SleepFunc): Promise<number> {
  const elapsed = now - last;                 // 経過時間
  const remaining = minInterval - elapsed;    // あと何秒待てばよいか
  if (remaining > 0) {                        // まだ間隔が足りていない
    await sleepFunc(remaining);
    return remaining;
  }
  return 0;                                   // 十分あいていれば待たない
}
const w1 = await waitGap(10.5, 10.0, 2, fakeSleep);  // 経過0.5秒 → 1.5秒足りない
console.log("経過0.5秒(min2)→ 待った秒数:", w1);      // 1.5
const w2 = await waitGap(20.0, 10.0, 2, fakeSleep);  // 経過10秒 → 十分あいている
console.log("経過10秒(min2) → 待った秒数:", w2);      // 0

// STEP 4: 429 のときだけ Retry-After 秒待つ。それ以外は待たない。
//         headers.get("Retry-After") は文字列("5")なので Number で数値化する。無ければ既定値。
console.log("--- STEP 4: 429 + Retry-After ---");
const res429 = new FakeResponse(429, { "Retry-After": "5" });
const res200 = new FakeResponse(200);
async function handle429(res: FakeResponse, sleepFunc: SleepFunc, defaultWait = 1): Promise<boolean> {
  if (res.status !== 429) return false;                          // 429 以外は何もしない
  const ra = res.headers.get("Retry-After");                    // 文字列 or null
  const wait = ra !== null ? Number(ra) : defaultWait;          // 数値化、無ければ既定値
  await sleepFunc(wait);
  return true;                                                  // 待った=リトライすべき
}
console.log("429 を処理 →", await handle429(res429, fakeSleep));  // true(5秒待とうとする)
console.log("200 を処理 →", await handle429(res200, fakeSleep));  // false(待たない)
console.log("ここまでで待とうとした秒数の記録:", waited);  // [2,5,1.5,5] のように溜まる

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは waitGap を新しい記録用 sleep で2回呼びます。
// 実行する前に予測してください:
//   Q1: waitGap(100.2, 100.0, 1, sleep2) は何秒待とうとする?(経過0.2秒, 最低1秒)
//   Q2: waitGap(100.0, 90.0, 1, sleep2) は?(経過10秒, 最低1秒。十分あいている?)
console.log("--- 予測してみよう ---");
const waited2: number[] = [];
const sleep2: SleepFunc = async (s) => { waited2.push(s); };
await waitGap(100.2, 100.0, 1, sleep2);
await waitGap(100.0, 90.0, 1, sleep2);
console.log("2回で待とうとした秒数:", waited2);

// --- 変えてみる ---------------------------------------------------------
// Retry-After ヘッダが無い 429 だと、handle429 は既定値(defaultWait)で待ちます。
// ヘッダが無いときに ?? / 三項でフォールバックする挙動を確認しておく。
console.log("--- 変えてみる ---");
const waited3: number[] = [];
const sleep3: SleepFunc = async (s) => { waited3.push(s); };
const res429NoHeader = new FakeResponse(429);  // Retry-After 無し
await handle429(res429NoHeader, sleep3, 3);    // 既定値 3 秒で待つ
console.log("Retry-After 無し(既定3秒)→ 待った秒数:", waited3);  // [3]

// --- 書いてみる ---------------------------------------------------------
// 課題: STEP 3 の waitGap と同じ計算で「今=12秒 / 前回=10秒 / 最低間隔=5秒」の
//       とき、実際に待つべき秒数を求めて result3 に入れてください(期待値: 3)。
//       関数を書いても、式だけで計算しても構いません。
// ヒント(概念レベル): 不足 = minInterval - (now - last) = 5 - (12 - 10)。
//   ただし「不足が正のときだけ」その値、そうでなければ 0(この課題では正になります)。
let result3: number | null = null;
// ここに書く(result3 に「待つべき秒数」を代入する)

check("概念3: 不足分の待ち時間", result3, 3,
  "不足 = minInterval - (now - last) = 5 - (12 - 10)。正なら その値、そうでなければ 0");

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
 * 概念            一言で                                         C#で言うと
 * fetch/Response  await fetch(url) で取得。Response は            HttpClient.GetAsync /
 *                 status/ok/text()/headers.get() を持つ。         HttpResponseMessage
 *                 text() は非同期(await 必須)、headers は無ければ null
 * robots.txt      "キー: 値" の行を User-agent でグループ分けし    設定ファイルを
 *                 Map に。Disallow は前方一致で禁止判定            セクションごとにパース
 * レート/429      setTimeout を Promise で包んだ sleep を「注入」。 await Task.Delay /
 *                 不足分だけ待つ。429 は Retry-After 秒待って再試行  Polly のリトライ
 *
 * 二本柱の再確認:
 * ・技術(fetch/Response/async)だけでは半人前。robots.txt を尊重し、正直な
 *   User-Agent を名乗り(例: "MyScraperBot/1.0 (+contact@example.com)"、
 *   ブラウザのふりで偽装しない)、間隔を空け、429 に従う——この「マナー」が
 *   揃って初めて、現場で使えるスクレイパーになります。
 *
 * この先どこで使うか:
 * ・演習 ex01〜ex04 で、今日手で追った getBodyIfOk / parseRobotsTxt+canFetch /
 *   waitIfNeeded+handle429 を「完成形」まで書きます。今日はどれも「一歩手前」
 *   ——分岐や計算の骨組みは見せたので、あとは自分で組み立てるだけです。
 * ・unit06 のキャップストーンでは、この3つが1本のスクレイパーに統合されます:
 *   robots.txt で巡回可否を判定 → Crawl-delay 分 sleep で待つ → fetch で取得 →
 *   429 なら Retry-After 待って再試行 → 本文を解析(unit02/03)→ CSV 出力(unit05)。
 *   今日のマナーは、その一気通貫の「関所」として最後まで効いてきます。
 *
 * 次: 演習 ex01_handle_response.ts へ。lesson を見ながらで OK。テストは
 *   npx vitest run unit04-fetch-and-manners/tests/ex01.test.ts
 *   (cwd は courses/web-scraping-ts/)
 * ===================================================================== */
