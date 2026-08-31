/* =====================================================================
 * 概念3: fetch と Response モデル(HTTPの返事をどう受け取るか)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念1の地図の一番上、「外部API → 取り込みジョブ」の矢印がこれです。
 *   さらに unit07 では、ブラウザ(React)から自前バックエンドを呼ぶのにも
 *   まったく同じ fetch を使います。つまり fetch はこのコースで最も登場回数の
 *   多いAPIです。実務で「取り込みが止まった」と言われたときに最初に見るのも、
 *   このレスポンスのステータスコードとボディです。
 *
 * ■ 解説:
 *   fetch(url) は Node v18 以降に標準で入っている「HTTPで取りに行く」関数です。
 *   C# で言えば HttpClient.GetAsync(url) にあたります。
 *
 *       const response = await fetch(url);   // Promise<Response> を返すので await が要る
 *
 *   戻ってくる Response は「HTTPの返事」を表すオブジェクトで、よく使うのは3つ:
 *
 *       response.ok        … ステータスが 200〜299 なら true、それ以外は false(真偽値)
 *       response.status    … 200 / 404 / 500 などのステータスコード(数値)
 *       response.headers.get("content-type")
 *                          … ヘッダを名前で取り出す。無ければ null
 *
 *   ★ ここが最重要かつ最も誤解される点:
 *     **404 でも 500 でも、fetch は例外を投げません。** 「相手はちゃんと返事をくれた。
 *     その中身が『そんなページ無い』だっただけ」という扱いだからです。
 *     fetch が例外を投げるのは、そもそも通信が成立しなかったとき(名前解決失敗・
 *     接続拒否・タイムアウト)だけ。C# の HttpClient も EnsureSuccessStatusCode() を
 *     呼ばなければ同じ挙動なので、感覚は同じです。
 *     → だから **自分で response.ok を見て分岐する**。これを忘れると、404 の
 *       エラーページ(HTML)を JSON としてパースしようとして意味不明な例外が出ます。
 *
 *   本文の取り出しは、さらにもう1回 await が要ります:
 *
 *       const data = await response.json();  // 本文を最後まで受信し、JSONとして解釈する
 *
 *     なぜ2段 await なのか: fetch が返る時点ではヘッダしか届いていない(本文はまだ
 *     流れてきている途中)からです。.json() はその続きを最後まで読む非同期処理。
 *     ほかに .text()(文字列のまま)もあり、パース前の生の中身を見たいときに使います。
 *
 *   ★ そして型の話:
 *     response.json() の戻り値の型は Promise<any> です。any は「TypeScript の
 *     型チェックを完全に放棄する」という印で、any のまま持ち回ると .titel のような
 *     打ち間違いも黙って通ってしまいます。だからすぐ自分の型に落とします:
 *
 *       const books = (await response.json()) as Book[];   // ← ただの「約束」
 *
 *     ただし as は **実行時には何もしない**。相手が違う形を返してきても誰も止めません。
 *     TypeScript の型はコンパイル時に消えるからです。この穴を実行時検証(zod)で
 *     塞ぐのが unit02 の仕事。今日は「as は無検査の宣言でしかない」ことを体感し、
 *     最低限の手書きチェックを書けるところまでやります。
 *
 *   ■ このファイルの実行環境について:
 *     外部ネットワークには一切出ません。node:http の createServer で
 *     **自分のPCの中に使い捨てのHTTPサーバを立てて**、そこへ fetch します
 *     (127.0.0.1 = 自分自身。ポート 0 を指定すると空いているポートが自動で選ばれる)。
 *     本物のURLに向けるのと fetch の書き方は完全に同じです。
 * ===================================================================== */

import http from "node:http";

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

// --- 見る(worked example) ---------------------------------------------
// GOAL: fetch → Response(ok/status/headers)→ await json() → 自分の型、の流れを一通り見る。
//       そして「404 でも fetch は例外を投げない」ことを自分の目で確認する。

// STEP 1: 使い捨てのローカルAPIサーバを立てる(ここは今日の学習対象ではない。unit06 で本格的にやる)
const server = http.createServer((req, res) => {
  if (req.url === "/books") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify([
      { id: "bk-1", title: "吾輩は猫である", price: 780 },
      { id: "bk-2", title: "銀河鉄道の夜", price: 640 },
      { id: "bk-3", title: "坊っちゃん", price: 520 },
    ]));
  } else {
    // 存在しないパスには 404 と、JSONのエラーボディを返す
    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "not found" }));
  }
});
// listen はコールバック方式なので、Promise に包んで await できる形にする(概念2の new Promise)
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const addr = server.address();
const port = typeof addr === "object" && addr !== null ? addr.port : 0;
const BASE = `http://127.0.0.1:${port}`;
console.log("STEP 1: ローカルAPIを起動 →", BASE);

// STEP 2: fetch して Response の中身を覗く(まだ本文は読んでいない)
const res1 = await fetch(`${BASE}/books`);
console.log("STEP 2: ok =", res1.ok, "/ status =", res1.status,
  "/ content-type =", res1.headers.get("content-type"));

// STEP 3: 本文を JSON として読む(fetch とは別にもう1回 await)
const raw = await res1.json();
console.log("STEP 3: json() の戻り =", raw);
console.log("STEP 3: 件数 =", Array.isArray(raw) ? raw.length : "(配列ではない)");

// STEP 4: 404 を叩いてみる — fetch は例外を投げるか?
const res2 = await fetch(`${BASE}/missing`);
console.log("STEP 4: 例外は投げられず、ここに到達する。ok =", res2.ok, "/ status =", res2.status);
console.log("STEP 4: 404 のボディ =", await res2.json());

// STEP 5: any を自分の型に落とす。as は「無検査の宣言」でしかないことも確認する
type Book = { id: string; title: string; price: number };
const res3 = await fetch(`${BASE}/books`);
const books = (await res3.json()) as Book[]; // ← 実行時には何のチェックもしていない
console.log("STEP 5: 型を付けた後 books[0].title =", books[0]?.title);
// 実行時検証の最小形(unit02 の zod は、これを宣言的に・入れ子まで自動でやってくれる道具)
function isBook(v: unknown): v is Book {
  return typeof v === "object" && v !== null
    && typeof (v as Book).id === "string"
    && typeof (v as Book).title === "string"
    && typeof (v as Book).price === "number";
}
console.log("STEP 5: 全件が Book の形か =", books.every(isBook));
console.log("STEP 5: 404 のボディを Book とみなせるか =", isBook({ error: "not found" }));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) /missing(404)のレスポンスに対して (await res.json()) as Book[] と書き、
//       books[0].title を読んだら何が起きる? 例外? undefined? 空文字?
//   (2) 同じ /books のレスポンスに対して .json() を2回呼んだらどうなる?
//       (ヒント: 本文は「一度だけ流れてくる川」です)
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const res4 = await fetch(`${BASE}/missing`);
const notBooks = (await res4.json()) as Book[]; // 型は通る。中身は { error: "not found" }
console.log("変えてみる (1): notBooks =", notBooks, "/ notBooks[0]?.title =", notBooks[0]?.title);

const res5 = await fetch(`${BASE}/books`);
await res5.json();               // 1回目: 成功
try {
  await res5.json();             // 2回目
  console.log("変えてみる (2): 2回目も成功した");
} catch (err) {
  console.log("変えてみる (2): 2回目は例外 →", (err as Error).message);
}
console.log("変えてみる (2): bodyUsed(本文を読み終えたか)=", res5.bodyUsed);

// --- 書いてみる ---------------------------------------------------------
// 課題: getTitles(url) を完成させてください。
//       ・url を fetch して、response.ok が false なら [] を返す(例外は投げない)
//       ・ok なら本文を Book[] として取り出し、タイトルだけの配列にして返す
// ヒント(概念レベル): await fetch → response.ok で早期 return → await response.json() を
//   as Book[] で受けて .map。await は2回必要です。
async function getTitles(url: string): Promise<string[]> {
  // ここに書く(タイトルの配列を return する。書けたら下の「未実装の目印」の行は消す)
  return []; // 未実装の目印
}

const result3 = {
  found: await getTitles(`${BASE}/books`),
  missing: await getTitles(`${BASE}/missing`),
};

check("概念3: Response を見てから型に落とす", result3,
  { found: ["吾輩は猫である", "銀河鉄道の夜", "坊っちゃん"], missing: [] },
  "found が [] のままなら getTitles が未実装。found に文字列以外が入るなら map の中で " +
  "b.title を返せていない。missing が [] にならないなら response.ok の分岐が抜けている");

// 後片付け: 立てたサーバを閉じる(閉じないとプロセスが終わらない)
server.close();

export {};
