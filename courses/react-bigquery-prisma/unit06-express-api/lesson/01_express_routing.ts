/* =====================================================================
 * 概念1: Express のルーティング — HTTPリクエストを関数に振り分ける
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit01 で描いた地図の、真ん中のマスを今日から作ります。
 *
 *       ブラウザ (React) ──fetch──▶ 【自前バックエンドAPI】 ──▶ Prisma / BigQuery
 *
 *   unit07 で React から `fetch("/api/books?q=猫")` と書くとき、その向こう側で
 *   リクエストを受け止める人が必要です。それが Express です。
 *   実務では「一覧を返す」「1件を返す」「1件登録する」の3種類がバックエンドの
 *   仕事の大半を占めます。今日はまずその3つを、HTTPの作法(パス・メソッド・
 *   ステータスコード)ごと書けるようにします。
 *
 * ■ 解説:
 *
 *   ● Express とは何か
 *     Node には標準で http モジュール(生のHTTPサーバ)がありますが、素で使うと
 *     「URLが /api/books か /api/books/7 かを自分で文字列比較して分岐する」
 *     ような原始的なコードになります。Express はその上に
 *     **「メソッド + パスの形」で関数に振り分ける仕組み** を載せた最小の枠組みです。
 *
 *     C# で言えば ASP.NET Core の Web API。対応表:
 *
 *       Express                                ASP.NET Core
 *       const app = express()                  WebApplication.CreateBuilder().Build()
 *       app.get("/api/books", handler)         app.MapGet("/api/books", handler)
 *                                              または [HttpGet("api/books")] のアクション
 *       app.use(なにか)                        app.Use(...) / ミドルウェアパイプライン
 *       app.listen(3000)                       app.Run()
 *
 *     決定的な違いが1つ。ASP.NET Core は属性やDIコンテナが「勝手に」多くを
 *     やってくれますが、**Express は既定では本当に何もしません**。
 *     JSONボディの読み取りも、CORSも、エラーの整形も、全部自分で足します。
 *     この「足りない分を自分で組む」感覚が、概念2以降のテーマになります。
 *
 *   ● ハンドラの形
 *       app.get(パス, (req, res) => { ... });
 *     req  … リクエスト(HttpRequest 相当)。入ってきた情報が全部ここにある
 *     res  … レスポンス(HttpResponse 相当)。**これを使って返事を書く**
 *     戻り値ではなく res を操作して返す、というのが Express の流儀です
 *     (ASP.NET Core の `return Ok(x);` に慣れていると最初つまずくポイント)。
 *
 *   ● リクエストから値を取り出す3つの場所
 *       req.params  … パスの中の変数。 app.get("/api/books/:id") の :id
 *                     → req.params.id     C#: [FromRoute]
 *       req.query   … ?q=猫&page=2 の部分  → req.query.q      C#: [FromQuery]
 *       req.body    … POST/PUT のJSON本文  → req.body         C#: [FromBody]
 *
 *     ★ 重要: req.params の値は **常に文字列** です。/api/books/7 の 7 も "7"。
 *       HTTPのURLに「数値型」という概念が無いからです。C# は [FromRoute] int id と
 *       書けばフレームワークが変換+失敗時に400までやってくれますが、
 *       Express は何もしてくれません。自分で変換し、自分で検証します(概念2)。
 *     ★ req.body は express.json() を足すまで **undefined** です。これも概念2で。
 *
 *   ● レスポンスを返すAPI
 *       res.json(obj)             … 200 + JSON本文             C#: Ok(obj)
 *       res.status(404).json(obj) … ステータスを決めてJSON      C#: NotFound(obj)
 *       res.status(204).end()     … 本文なしで終わる            C#: NoContent()
 *
 *     ★ レスポンスは1リクエストにつき1回だけ。res.json を2回呼ぶと
 *       「ERR_HTTP_HEADERS_SENT」というエラーになります。だから分岐で返したら
 *       必ず `return;` する癖をつけます(C# なら return NotFound(); の return と同じ)。
 *
 *   ● ステータスコードの設計(実務の合意事項。ここを雑にすると画面側が地獄を見る)
 *       200 OK        … 取得・更新に成功
 *       201 Created   … **新しく作った**。POST の成功はこちら
 *       204 No Content… 成功したが返す本文が無い(削除など)
 *       400 Bad Request… **呼び出し側が悪い**。パラメータの形が違う(概念2)
 *       404 Not Found … 指定されたリソースが無い
 *       500 Internal Server Error … **サーバ側が悪い**。想定外の例外(概念3)
 *     4xx と 5xx の線引きが最重要です。「リクエストを直せば成功しうる」なら4xx、
 *     「何度やっても同じで、直すのはサーバの人」なら5xx。
 *
 *   ● サーバの起動と停止
 *       const server = app.listen(ポート番号, "127.0.0.1");  // 待ち受け開始
 *       server.close();                                      // 停止
 *     このレッスンでは **ポート番号に 0 を指定** します。0 は「OSが空いている
 *     ポートを勝手に選ぶ」という意味で、既に3000番を使っていても衝突しません。
 *     選ばれた番号は server.address() で後から分かります。
 *     実務では 0 ではなく process.env.PORT ?? 3000 のように書きます(unit01の環境変数)。
 * ===================================================================== */

import express from "express";
import type { AddressInfo } from "node:net";

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

// --- 実験用の小道具(このユニットの全レッスン共通・書き換え不要) ----------
//   withServer: app を一時的に起動し、中で fetch し、必ず停止する。
//     「起動しっぱなしでプロセスが終わらない」事故を防ぐための定型です。
//     app.listen は非同期なので、listening イベントを待ってから中身を実行します。
async function withServer(app: express.Express, fn: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1"); // 0 = 空きポートをOSに選ばせる
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve())); // 必ず閉じる
  }
}

//   hit: URLを叩いて { status, body } を返す。本文がJSONでなければ先頭だけ文字列で返す
//     (Express の既定の404はHTMLを返してくるので、JSON.parse で落ちないようにしている)
type Hit = { status: number; body: unknown };
async function hit(url: string, init?: RequestInit): Promise<Hit> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = `(JSONではない) ${text.slice(0, 60).replace(/\n/g, "")}`; }
  return { status: res.status, body };
}

//   fmt: 表示用。console.log はネストが深いと [Object] と省略するので JSON 文字列にする
function fmt(h: Hit): string {
  return `status=${h.status} body=${JSON.stringify(h.body)}`;
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「1件取得 / 一覧 / 新規登録」の3本のルートを定義し、実際にHTTPで叩いて
//       ステータスコードと本文がどう返るかを目で見る。

// STEP 0: このレッスンのデータ(本来はDBから取る。unit04 の Prisma がここに入る)
type Book = { id: number; title: string; author: string };
const BOOKS: Book[] = [
  { id: 1, title: "吾輩は猫である", author: "夏目漱石" },
  { id: 2, title: "坊っちゃん", author: "夏目漱石" },
  { id: 3, title: "走れメロス", author: "太宰治" },
];

// STEP 1: アプリを作る。この時点ではルートが1本も無い「空のパイプライン」
const app = express();

// STEP 2: 死活確認エンドポイント。実務では監視やロードバランサが叩く定番
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" }); // 200 + {"status":"ok"}
});
//   ↑ 使わない引数に _ を付けるのは「意図的に使っていない」という TypeScript の慣習

// STEP 3: パス変数(:id)で1件取得。無ければ 404
app.get("/api/books/:id", (req, res) => {
  const rawId = req.params.id;              // 必ず文字列。"7" であって 7 ではない
  const id = Number(rawId);                 // 自分で数値に変換する
  const book = BOOKS.find((b) => b.id === id); // C#: BOOKS.FirstOrDefault(b => b.Id == id)
  console.log(`  [server] GET /api/books/${rawId}  typeof req.params.id = ${typeof rawId}`);
  if (book === undefined) {
    res.status(404).json({ error: "not_found", id: rawId });
    return; // ★ ここで return しないと下の res.json も走って二重送信になる
  }
  res.json(book);
});

// STEP 4: クエリ文字列で一覧を絞る
app.get("/api/books", (req, res) => {
  const q = req.query.q;                    // 型は string | string[] | ... | undefined(概念2で正体を暴きます)
  console.log("  [server] GET /api/books  req.query =", req.query);
  const list = typeof q === "string"
    ? BOOKS.filter((b) => b.title.includes(q) || b.author.includes(q))
    : BOOKS;
  res.json({ total: list.length, items: list });
});

// STEP 5: POST は成功したら 201。まだ req.body は読めない(= undefined)ことも確認する
app.post("/api/books", (req, res) => {
  console.log("  [server] POST /api/books  req.body =", req.body, `(typeof ${typeof req.body})`);
  const created: Book = { id: 99, title: "(まだ本文を読めていない)", author: "?" };
  res.status(201).json(created); // 作成成功は 200 ではなく 201
});

// STEP 6: 実際に起動して叩く
await withServer(app, async (base) => {
  console.log("STEP 6: サーバ起動 →", base);
  console.log("  health      :", fmt(await hit(`${base}/api/health`)));
  console.log("  1件取得(有):", fmt(await hit(`${base}/api/books/2`)));
  console.log("  1件取得(無):", fmt(await hit(`${base}/api/books/999`)));
  console.log("  一覧(絞込) :", fmt(await hit(`${base}/api/books?q=夏目漱石`)));
  console.log("  POST        :", fmt(await hit(`${base}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "人間失格", author: "太宰治" }),
  })));
});
//   ★ POST の出力に注目: ちゃんとJSONを送ったのに req.body は undefined。
//     Express は「頼まれていないこと(本文の解釈)は一切やらない」ためです。→ 概念2

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 定義していないパス /api/authors を GET したら、ステータスは何番?
//       そして本文は JSON? それとも別の形式?
//   (2) GET /api/books/abc(idが数値でない)は何番で返る? 400? 404? 500?
//       — STEP 3 のコードを読んで、Number("abc") が何になるかから考えてください。
//   (3) 定義済みのパス /api/books に **POST ではなく DELETE** を送ったら何番?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
await withServer(app, async (base) => {
  console.log("変えてみる (1) 未定義のパス :", fmt(await hit(`${base}/api/authors`)));
  console.log("変えてみる (2) id が数値でない:", fmt(await hit(`${base}/api/books/abc`)));
  console.log("変えてみる (3) 未定義のメソッド:", fmt(await hit(`${base}/api/books`, { method: "DELETE" })));
});
//   ※ (1)(3) の「Cannot GET /api/authors」というHTMLが Express の既定の404です。
//     JSONを期待している画面側にHTMLが返るのは事故のもとなので、概念3で
//     「全ルートの後ろに置く受け皿」を作ってJSONに統一します。
//   ※ (2) は 404 です。Number("abc") は NaN、NaN === b.id は常に false なので
//     find が undefined を返すからです。しかし本当は **リクエストの形が不正**
//     なので 400 が正しい。この違いを埋めるのが概念2の入口検証です。

// --- 書いてみる ---------------------------------------------------------
// 課題: app2 に GET /api/authors/:name を1本追加してください。
//   ・パス変数 name を受け取り、下の AUTHORS からその著者の冊数を探す
//   ・見つかったら 200 で { name: <名前>, bookCount: <冊数> } を返す(このキー順で)
//   ・見つからなければ 404 で { error: "not_found" } を返す
// ヒント(概念レベル): req.params から名前を取り、Record を引いて undefined かどうかで分岐。
//   分岐で返したら return を忘れないこと。
const AUTHORS: Record<string, number> = { soseki: 2, dazai: 1, akutagawa: 4 };
const app2 = express();

// ここに書く(app2.get(...) を1本登録する)

// 判定用の小道具(書き換え不要): 上でルートが登録されていなければ、ここが受け止める
app2.use((_req, res) => {
  res.status(404).json({ error: "route_not_registered" });
});

let result1: { foundStatus: number; foundBody: unknown; missingStatus: number; missingBody: unknown } | null = null;
await withServer(app2, async (base) => {
  const found = await hit(`${base}/api/authors/dazai`);
  const missing = await hit(`${base}/api/authors/unknown_person`);
  result1 = {
    foundStatus: found.status, foundBody: found.body,
    missingStatus: missing.status, missingBody: missing.body,
  };
});

check("概念1: ルートを1本書く", result1,
  { foundStatus: 200, foundBody: { name: "dazai", bookCount: 1 }, missingStatus: 404, missingBody: { error: "not_found" } },
  "body が {\"error\":\"route_not_registered\"} → まだ app2 にルートを登録していない(未記入)。" +
  "foundStatus が 404 → パスの書き方が違う(\"/api/authors/:name\" と : 付きで書く)。" +
  "foundBody のキー名や順番が違う → { name, bookCount } の順で res.json に渡す。" +
  "missingStatus が 200 → 見つからなかったときの分岐(undefined 判定)が無い。" +
  "ERR_HTTP_HEADERS_SENT が出た → 分岐の後に return を書いていない");

export {};
