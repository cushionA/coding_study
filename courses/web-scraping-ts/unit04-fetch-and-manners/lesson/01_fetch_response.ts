/* =====================================================================
 * 概念1: fetch と async/await、そして Response モデル
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   スクレイピングのパイプライン([1 取得]→[2 解析]→[3 整形]→[4 出力])の、
 *   いよいよ [1 取得] に入ります。ここまで(unit01〜03)は「取得済みのHTML文字列」
 *   がすでに手元にある前提でしたが、実際はネット越しにサーバーへ HTTP リクエストを
 *   送り、返ってきた応答からHTMLを取り出す必要があります。
 *
 *   ここで一番大事な心構え: スクレイピングは「相手のサーバー資源を借りる行為」です。
 *   1回のリクエストは相手のCPU・帯域・DBを少しずつ消費させます。雑にやれば
 *   IPブロック・法的リスク・最悪は相手サイトのダウンにつながります。だからこそ
 *   このユニットは「技術(fetch/Response)」と「マナー(robots.txt/レート制限)」の
 *   二本柱で進みます。今日はまず技術側、Response の扱いを固めます。
 *
 * ■ 解説:
 *   Node.js には fetch(url) が組み込まれています(ブラウザと同じ関数)。
 *   fetch は「Promise を返す非同期関数」です。C# の HttpClient.GetAsync(url) が
 *   Task<HttpResponseMessage> を返すのと、発想も構文もほぼ同じ:
 *
 *     C#:  HttpResponseMessage res = await httpClient.GetAsync(url);
 *     TS:  const res = await fetch(url);
 *
 *   await / async は C# とまったく同じ意味です。await は「Promise(=Task)が
 *   解決するまで待って、中身を取り出す」。await を使う関数には async を付けます。
 *
 *   fetch が返す Response は、C# の HttpResponseMessage に対応します:
 *
 *     Response(TS)              HttpResponseMessage(C#)          何をするもの
 *     res.status                res.StatusCode                    HTTPステータス番号(200,404,429…)
 *     res.ok                    res.IsSuccessStatusCode           成功(2xx〜3xx未満)なら true
 *     await res.text()          await res.Content.ReadAsStringAsync()  本文を文字列で取り出す(非同期!)
 *     res.headers.get("X")      res.Headers.TryGetValue("X",..)   ヘッダ取得。無ければ null を返す
 *
 *   注意点(C#との違い):
 *   ・res.text() は「非同期」です。await を付けないと文字列ではなく Promise が返ります。
 *   ・headers.get(name) は無ければ null を返す(C# の out パラメータではなく戻り値)。
 *
 *   このレッスンではネットワークには繋ぎません。fetch の戻り値 Response の代わりに、
 *   同じインターフェース(status / ok / text() / headers.get())を持つ小さな
 *   FakeResponse クラスをこのファイル内に定義して練習します。演習で使う
 *   data/fakeResponses.ts と同じ形なので、そのまま演習に持ち込めます。
 * ===================================================================== */

// check ヘルパー(全 lesson ファイル共通・先頭に配置)
// 未記入(null)でも例外で止めず [NG]+ヒントを出す。async の結果も渡せる。
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

// このレッスン内で使う「本物の Response のミニチュア」。
// 本物の fetch の戻り値 Response も、演習の data/fakeResponses.ts も、この
// FakeResponse も、status / ok / text() / headers.get() が同じ形なので、
// 「Response を受け取る関数」はどれを渡しても同じコードで動きます(構造的型付け)。
class FakeHeaders {
  private readonly map: Map<string, string>;
  constructor(entries: Record<string, string> = {}) {
    // ヘッダ名は大小無視で引けるよう、キーを小文字にして持つ
    this.map = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  }
  // 本物の Headers.get() と同じく、無ければ null(undefined ではない)を返す
  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) ?? null;
  }
}

class FakeResponse {
  readonly status: number;
  readonly headers: FakeHeaders;
  private readonly body: string;
  constructor(status: number, body = "", headers: Record<string, string> = {}) {
    this.status = status;
    this.body = body;
    this.headers = new FakeHeaders(headers);
  }
  // 本物の Response.ok と同じ判定(200〜399)
  get ok(): boolean {
    return this.status >= 200 && this.status < 400;
  }
  // 本物の Response.text() と同じく「非同期」で本文を返す(await が要る)
  async text(): Promise<string> {
    return this.body;
  }
}

// このレッスンで「サーバーから返ってきたつもり」の応答を3種類用意しておく。
const okRes = new FakeResponse(200, "<h1>ようこそ</h1>", { "Content-Type": "text/html; charset=utf-8" });
const notFoundRes = new FakeResponse(404, "Not Found", { "Content-Type": "text/plain" });
const rateLimitedRes = new FakeResponse(429, "Too Many Requests", { "Retry-After": "5" });

// --- 見る(worked example) ---------------------------------------------
// GOAL: await で Response から status / ok / text() / headers を取り出す流れを見る

// STEP 1: await は「Promise が解けるまで待つ」。okRes.text() は Promise<string> なので
//         await を付けて中身の文字列を取り出す。tsx はトップレベル await が使えるので
//         async 関数で包まなくてもこのまま await できる(C# の Main が async なのに近い)。
console.log("--- STEP 1: 本文を取り出す ---");
const body = await okRes.text();          // await 無しだと Promise が入ってしまう
console.log("status:", okRes.status, "/ ok:", okRes.ok);
console.log("body  :", body);

// STEP 2: await を付け忘れるとどうなるかを見ておく(よくあるバグ)。
//         await 無しの okRes.text() は「まだ解けていない Promise」そのもの。
console.log("--- STEP 2: await を忘れると ---");
console.log("await あり:", await okRes.text());
console.log("await なし:", okRes.text());  // Promise { ... } と表示され、文字列ではない

// STEP 3: ok による成功/失敗の分岐。404 は ok が false になる。
//         「成功したときだけ本文を使う」のが取得処理の基本形。
console.log("--- STEP 3: ok で分岐 ---");
for (const res of [okRes, notFoundRes]) {
  if (res.ok) console.log(`status ${res.status}: OK →`, await res.text());
  else console.log(`status ${res.status}: 失敗なので本文は使わない`);
}

// STEP 4: ヘッダの取り出し。無いヘッダは null が返るので ?? でフォールバックする。
//         okRes には Content-Type があるが Retry-After は無い。
console.log("--- STEP 4: ヘッダ ---");
console.log("Content-Type:", okRes.headers.get("Content-Type"));
console.log("Retry-After :", okRes.headers.get("Retry-After") ?? "(無し)");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは rateLimitedRes(429 Too Many Requests)の status と ok と
// Retry-After ヘッダを表示します。実行する前に予測してください:
//   Q1: 429 のとき res.ok は true? false?
//       (ヒント: ok は「200〜399 なら true」。429 はその範囲?)
//   Q2: Retry-After ヘッダには何が入っている?(rateLimitedRes の定義を見て)
console.log("--- 予測してみよう ---");
console.log("429 の status     :", rateLimitedRes.status);
console.log("429 の ok         :", rateLimitedRes.ok);
console.log("429 の Retry-After:", rateLimitedRes.headers.get("Retry-After"));

// --- 変えてみる ---------------------------------------------------------
// headers.get は「無ければ null」。存在しないヘッダを引くと何が返るか見ておく。
// この null を ?? で既定値に置き換えるのが、ヘッダを安全に扱う定石です(概念3で活用)。
console.log("--- 変えてみる ---");
console.log("存在しないヘッダ    :", okRes.headers.get("X-Nonexistent"));           // null
console.log("?? でフォールバック :", okRes.headers.get("X-Nonexistent") ?? "既定値"); // "既定値"

// --- 書いてみる ---------------------------------------------------------
// 課題: Response を受け取り、「ok なら本文(await text())の文字列、ok でなければ
//       null」を返す非同期関数 getBodyIfOk を書き、okRes に適用した結果を
//       result1 に入れてください(期待値: "<h1>ようこそ</h1>")。
//       これは演習 ex01 の getBodyIfOk とまったく同じ関数です。
// ヒント(概念レベル): async 関数にして、res.ok が false なら return null、
//   そうでなければ return await res.text()。呼び出し側も await getBodyIfOk(okRes)。
let result1: string | null = null;
// ここに書く(getBodyIfOk を定義し、await して result1 に代入する)

check("概念1: ok なら本文を返す", result1, "<h1>ようこそ</h1>",
  "async 関数内で res.ok が false なら null、そうでなければ await res.text()。呼び出しにも await を付ける");

export {};
