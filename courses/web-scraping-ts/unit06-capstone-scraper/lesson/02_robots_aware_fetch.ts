/* =====================================================================
 * 概念2: マナー層を関数として分離する — robots.txt 判定と sleep の「注入」
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   スクレイパーは相手のサーバーを借りて動きます。だから「取ってよいか(robots.txt)」を
 *   確認し、「間隔を空けて(Crawl-delay)」礼儀正しく巡回する——このマナー層を、
 *   本体の取得・解析ロジックから切り離して独立させます。切り離すと(1)テストが速くなり
 *   (実際に何秒も待たない)、(2)ルールを差し替えやすくなります。unit04 で書いた
 *   robots パーサとレート制限を、ここで「合成しやすい部品」として整えるのが狙いです。
 *
 * ■ 解説:
 *   ● robots 判定を1つの関数 isAllowed に閉じ込める
 *     isAllowed(robotsTxt, userAgent, targetUrl) は「このURLを取ってよいか」を
 *     true/false で返すだけの関数。呼ぶ側は robots.txt の中身を一切知らなくてよい。
 *     C# で言えば bool CanFetch(...) を持つ IRobotsChecker インターフェースの実装で、
 *     利用側はインターフェース越しに呼ぶ——「関心の分離」です。
 *
 *   ● sleep を「引数で受け取る」= 依存性の注入(DI)
 *     待機を関数内で直接 setTimeout する代わりに、sleepFn という関数を引数で渡します。
 *
 *       async function realSleep(sec: number) {                // 本番: 実際に待つ
 *         return new Promise<void>((resolve) => setTimeout(resolve, sec * 1000));
 *       }
 *       async function fakeSleep(_sec: number) {}               // テスト: 即座に返る
 *
 *     どちらも「(秒) => Promise<void>」という同じ形(シグネチャ)。呼ぶ側は中身を
 *     気にせず await sleepFn(delay) するだけ。C# で ISleeper を注入して、テストでは
 *     Task.CompletedTask を返すモックに差し替えるのと同じ発想です。これで
 *     「本番は待つ／テストは一瞬」を1つのコードで両立できます。
 *
 *   ● Promise と async/await(TSの復習)
 *     Promise<T> は C# の Task<T>。async 関数は必ず Promise を返し、await で
 *     結果を取り出します。setTimeout はコールバックなので、new Promise で包んで
 *     await できる形に「約束(Promise)化」します。これは覚えておくと便利な定石です。
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

const BASE_URL = "https://polaris-coffee.example/";
const USER_AGENT = "PolarisScraperBot";

// 縮小版 robots.txt。「* 向けの共通ルール」と「うちのbot専用ルール」の2ブロック。
const ROBOTS_TXT = `User-agent: *
Disallow: /admin/
Disallow: /cart/
Crawl-delay: 1

User-agent: PolarisScraperBot
Disallow: /admin/
Crawl-delay: 1`;

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「robots.txt を判定する関数」と「注入した sleepFn で礼儀正しく巡回する関数」
//       を、それぞれ独立した部品として動かす

// STEP 1: robots.txt を User-agent ブロックごとに分解する小さなパーサ(unit04 の復習)。
//         "キー: 値" 行を読み、User-agent 行が来るたびに新しいブロックを開始する。
type RobotsRule = { userAgent: string; disallows: string[] };
function parseRobotsTxt(robotsTxt: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let current: RobotsRule | null = null;
  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;      // 空行・コメントは無視
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();                    // 値に : が含まれても復元
    if (key.trim().toLowerCase() === "user-agent") {
      current = { userAgent: value, disallows: [] };
      rules.push(current);
    } else if (key.trim().toLowerCase() === "disallow" && current) {
      current.disallows.push(value);
    }
  }
  return rules;
}
console.log("--- STEP 1: robots.txt の構造 ---");
console.log(JSON.stringify(parseRobotsTxt(ROBOTS_TXT), null, 2));

// STEP 2: 判定を1つの関数に閉じ込める。自分のbot専用ブロックがあればそれを、
//         無ければ "*" ブロックを採用し、Disallow に前方一致したら false。
//         new URL(url).pathname は "https://.../admin/x.html" から "/admin/x.html" を取り出す。
function isAllowed(robotsTxt: string, userAgent: string, targetUrl: string): boolean {
  const rules = parseRobotsTxt(robotsTxt);
  const matched = rules.find((r) => r.userAgent === userAgent)
    ?? rules.find((r) => r.userAgent === "*");   // 専用が無ければ * にフォールバック
  if (!matched) return true;
  const urlPath = new URL(targetUrl).pathname;
  return !matched.disallows.some((d) => d !== "" && urlPath.startsWith(d));
}
console.log("--- STEP 2: 取得可否の判定 ---");
console.log("list_page_1 は取得可?:", isAllowed(ROBOTS_TXT, USER_AGENT, BASE_URL + "list_page_1.html"));
console.log("admin/secret は取得可?:", isAllowed(ROBOTS_TXT, USER_AGENT, BASE_URL + "admin/secret.html"));

// STEP 3: sleep を「注入」する。同じ crawl 関数に、本番用と偽物を差し替えて渡す。
//         crawl は sleepFn の中身を知らない——ただ await sleepFn(delay) するだけ。
async function crawl(urls: string[], sleepFn: (sec: number) => Promise<void>, delay: number): Promise<string[]> {
  const log: string[] = [];
  for (const url of urls) {
    log.push(`取得: ${url}`);
    await sleepFn(delay);            // ここで礼儀正しく待つ(中身は注入次第)
  }
  return log;
}
// テスト用の偽 sleep: 実際には待たず、呼ばれた回数だけ数える。
let sleepCalls = 0;
const fakeSleep = async (_sec: number) => { sleepCalls += 1; };
const crawlLog = await crawl([BASE_URL + "item_1.html", BASE_URL + "item_2.html"], fakeSleep, 1);
console.log("--- STEP 3: 注入した fakeSleep で巡回 ---");
console.log(crawlLog);
console.log("sleep が呼ばれた回数:", sleepCalls, "(待たずに一瞬で終わる)");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、cart 配下のURLと、通常の商品URLの2つを isAllowed に通します。
// 実行する前に予測: robots.txt には PolarisScraperBot 専用ブロックがあり、そこには
//   Disallow: /cart/ が「無い」。* ブロックには /cart/ がある。専用ブロックが優先される。
//   さて cart/checkout は取得可(true)でしょうか、不可(false)でしょうか?
console.log("--- 予測してみよう ---");
console.log("cart/checkout:", isAllowed(ROBOTS_TXT, USER_AGENT, BASE_URL + "cart/checkout.html"));
console.log("item_5:", isAllowed(ROBOTS_TXT, USER_AGENT, BASE_URL + "item_5.html"));

// --- 変えてみる ---------------------------------------------------------
// 本物の sleep も約束(Promise)化してみる。setTimeout をそのままでは await できないので、
// new Promise で包む。本来は setTimeout(resolve, sec * 1000) だが、lesson の実行が
// 待たされないようここでは 0ms 固定にしてある(回数だけ表示して体感する)。
const realSleep = (_sec: number) => new Promise<void>((resolve) => setTimeout(resolve, 0));
let realCalls = 0;
const countingRealSleep = async (sec: number) => { realCalls += 1; await realSleep(sec); };
await crawl([BASE_URL + "item_3.html"], countingRealSleep, 1);
console.log("--- 変えてみる ---");
console.log("本物sleep(0ms)でも同じ形で動く。呼ばれた回数:", realCalls);

// --- 書いてみる ---------------------------------------------------------
// 課題: isAllowed を使って、下の候補URL配列から「取得してよいURLだけ」を残した
//       配列を作り、result2 に入れてください。
//       (admin 配下は不可、それ以外は可。robots.txt は上の ROBOTS_TXT、UAは USER_AGENT)
//       期待値: [
//         "https://polaris-coffee.example/item_1.html",
//         "https://polaris-coffee.example/cart/checkout.html",
//         "https://polaris-coffee.example/item_2.html",
//       ]
// ヒント(概念レベル): candidates.filter(...) の中で isAllowed(ROBOTS_TXT, USER_AGENT, url)
//   が true のものだけ残す。cart が残るのは「専用ブロックが優先」だから(予測で確認済み)。
const candidates = [
  BASE_URL + "item_1.html",
  BASE_URL + "admin/dashboard.html",
  BASE_URL + "cart/checkout.html",
  BASE_URL + "item_2.html",
];

let result2: string[] | null = null;
// ここに書く(result2 に代入する。filter で isAllowed が true のものだけ残す)

check("概念2: 取得可URLだけ残す", result2, [
  "https://polaris-coffee.example/item_1.html",
  "https://polaris-coffee.example/cart/checkout.html",
  "https://polaris-coffee.example/item_2.html",
], "candidates.filter((url) => isAllowed(ROBOTS_TXT, USER_AGENT, url))");

export {};
