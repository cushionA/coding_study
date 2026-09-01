/* =====================================================================
 * 概念2: 入口で検証する — express.json() と zod、そして 400 の返し方
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念1の最後で2つの「穴」を見ました。
 *     ・POST でJSONを送ったのに req.body が undefined
 *     ・/api/books/abc という壊れたリクエストが 404 になってしまう(本当は 400)
 *   どちらも「入口で受け取ったものを、ちゃんと解釈・検証していない」ことが原因です。
 *
 *   unit02 で zod を学んだとき、「検証は境界1箇所で。そこを通った内側では
 *   値の形を疑わなくてよい」と書きました。あのときの境界は外部APIでしたが、
 *   **バックエンドAPIの入口は、もっと危険な境界** です。理由:
 *     ・外部APIは相手が壊れているだけ。ブラウザからのリクエストは
 *       **悪意を持って壊されている可能性** がある(?limit=999999999 で
 *       DBを殴る、想定外の型で例外を誘発してスタックトレースを覗く、など)
 *     ・ブラウザのJSは誰でも書き換えられる。「画面側で入力チェックしたから
 *       サーバでは不要」は成立しません。curl で直接叩けば素通りします。
 *   実務の合言葉は「**クライアントを信用しない**(never trust the client)」。
 *
 * ■ 解説:
 *
 *   ● ミドルウェアとは(Express の心臓部)
 *     `(req, res, next) => { ... }` という形の関数です。app.use(fn) で登録すると、
 *     **登録した順に** 上から実行され、各段が next() を呼ぶと次へ進みます。
 *     next() を呼ばずに res で返事を書けば、そこで打ち切り(以降は実行されない)。
 *
 *     C# の ASP.NET Core とまったく同じ発想です:
 *       app.Use(async (context, next) => { ...; await next(); });   // C#
 *       app.use((req, res, next) => { ...; next(); });              // Express
 *     ASP.NET Core で app.UseAuthentication() → app.UseAuthorization() の
 *     **順番を間違えると動かない** のと同じで、Express も登録順がすべてです。
 *
 *   ● express.json()
 *     Express に最初から入っているミドルウェアで、
 *     「Content-Type が application/json のリクエスト本文を読んで JSON.parse し、
 *       結果を req.body に載せる」だけをやります。
 *     C# で言えば ASP.NET Core の入力フォーマッタ([FromBody] を成立させている裏方)。
 *     ASP.NET Core では自動ですが、Express では **自分で app.use する必要がある**。
 *     これが概念1で req.body が undefined だった理由です。
 *
 *       app.use(express.json({ limit: "100kb" }));
 *     limit は「これより大きい本文は受け取らずに 413 を返す」上限。
 *     指定しないと既定100kb。巨大なJSONを投げつけられてメモリを食う攻撃への最低限の蓋です。
 *
 *     ★ 注意: express.json() を入れても、Content-Type が application/json でなければ
 *       req.body は undefined のままです。「JSONだと名乗ったものだけ解釈する」ため。
 *
 *   ● req.query の型がやたら複雑な理由
 *     `req.query.q` の型は string ではありません。URL は
 *       ?q=cat&q=dog
 *     のように **同じキーを複数回書ける** ので、値は文字列にも配列にもなり得ます。
 *     さらにネストした形(?a[b]=1)も表現できます。だから型は
 *       string | string[] | ParsedQs | ParsedQs[] | undefined
 *     という化け物になります。C# の Request.Query[key] が StringValues
 *     (0個/1個/複数個を表せる型)なのと同じ事情です。
 *     → これを毎回 typeof で場合分けするのは地獄なので、**zod で1回だけ正規化** します。
 *
 *   ● 今回の新しい zod API(unit02 で学んだ z.object / safeParse / issues は既習)
 *       z.coerce.number()  … 「まず Number() で変換してから」数値として検証する。
 *                            クエリは必ず文字列で来るので、これがほぼ必須になる。
 *                            "2" → 2 で通る。"abc" → NaN → 失敗。
 *       .default(20)       … 入力が undefined のときに使う既定値。
 *                            → limit を書かずに呼ばれたら 20 になる。C# の既定引数に近い
 *       .max(100)          … 上限。**攻撃対策として実務で必ず入れる**
 *                            (?limit=999999 でDBを全件走査させないため)
 *     これらを組むと「クエリ文字列(文字列だらけ)→ 型の付いた設定オブジェクト」
 *     への変換器が1つの値として書けます。
 *
 *   ● 400 レスポンスの形を統一する
 *     エラー時の本文の形がエンドポイントごとにバラバラだと、画面側が
 *     毎回違う処理を書く羽目になります。このコースでは通してこの形にします:
 *
 *       { "error": "invalid_query", "issues": [ { "path": "limit", "message": "..." } ] }
 *
 *     error は機械が分岐するための短い識別子、issues は人間(と開発者)向けの詳細。
 *     C# の ProblemDetails(RFC 7807)と同じ役割です。
 *
 *   ★ そして最重要の原則:
 *     **検証を通った後は、req.query / req.body を二度と触らない。**
 *     safeParse が返した data(型が付いている)だけを下流に渡します。
 *     こうすると「内側のコードは形を疑わなくてよい」状態が保たれます。
 * ===================================================================== */

import express from "express";
import { z } from "zod";
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

// --- 実験用の小道具(概念1と同じ・書き換え不要) ---------------------------
async function withServer(app: express.Express, fn: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}
type Hit = { status: number; body: unknown };
async function hit(url: string, init?: RequestInit): Promise<Hit> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = `(JSONではない) ${text.slice(0, 60).replace(/\n/g, "")}`; }
  return { status: res.status, body };
}
function fmt(h: Hit): string { return `status=${h.status} body=${JSON.stringify(h.body)}`; }

// --- 見る(worked example) ---------------------------------------------
// GOAL: クエリ文字列とJSONボディを zod で「型の付いた値」に変換し、
//       壊れたリクエストには 400 と理由を返すところまでを通しで見る。

type Book = { id: number; title: string; author: string };
const BOOKS: Book[] = [
  { id: 1, title: "吾輩は猫である", author: "夏目漱石" },
  { id: 2, title: "坊っちゃん", author: "夏目漱石" },
  { id: 3, title: "走れメロス", author: "太宰治" },
];

const app = express();

// STEP 1: 自前のミドルウェアでパイプラインの動きを体感する
//   (req, res, next) の3引数。next() を呼ばないと**リクエストがここで止まる**
app.use((req, _res, next) => {
  console.log(`  [mw1] ${req.method} ${req.originalUrl} — ここから下へ進みます`);
  next(); // ← これを忘れるとブラウザは永久に待ち続ける(実務でよくやる事故)
});

// STEP 2: JSONボディを読むミドルウェアを登録する。これで req.body が生える
app.use(express.json({ limit: "100kb" }));

// STEP 3: クエリ文字列のスキーマ。「文字列だらけの入力 → 型の付いた設定」への変換器
const ListQuerySchema = z.object({
  q: z.string().min(1).optional(),                        // 無くてもよい検索語
  page: z.coerce.number().int().min(1).default(1),        // "2" → 2。無ければ 1
  limit: z.coerce.number().int().min(1).max(100).default(20), // 上限100は攻撃対策
});
type ListQuery = z.infer<typeof ListQuerySchema>;
//   ↑ ListQuery は { q?: string; page: number; limit: number }。
//     .default() を付けた項目は「出力では必ず存在する」ので ? が付かないのがポイント。

// STEP 4: 400 を返す共通関数(レスポンスの形を1箇所に固定する)
function respondInvalid(res: express.Response, error: string, zodError: z.ZodError): void {
  res.status(400).json({
    error,
    issues: zodError.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

// STEP 5: GET /api/books — 入口で検証し、通った後は data だけを使う
app.get("/api/books", (req, res) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    respondInvalid(res, "invalid_query", parsed.error);
    return; // 概念1と同じく、返したら必ず return
  }
  const query: ListQuery = parsed.data; // ここから先は型が付いた世界。req.query はもう見ない
  console.log("  [server] 検証済みクエリ =", query, `(typeof page = ${typeof query.page})`);

  const filtered = query.q === undefined
    ? BOOKS
    : BOOKS.filter((b) => b.title.includes(query.q!) || b.author.includes(query.q!));
  const start = (query.page - 1) * query.limit;
  res.json({ total: filtered.length, page: query.page, items: filtered.slice(start, start + query.limit) });
});

// STEP 6: POST /api/books — ボディの検証。成功は 201
const CreateBookSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(100),
  publishedYear: z.number().int().min(1000).max(2100).optional(),
});
app.post("/api/books", (req, res) => {
  //   req.body は any 型(= 何でも入る)。express.json() が通らなければ undefined。
  //   safeParse は undefined を渡されても例外を投げず「失敗」を返すので、そのまま渡せる。
  const parsed = CreateBookSchema.safeParse(req.body);
  if (!parsed.success) {
    respondInvalid(res, "invalid_body", parsed.error);
    return;
  }
  const created: Book = { id: BOOKS.length + 1, title: parsed.data.title, author: parsed.data.author };
  res.status(201).json(created);
});

// STEP 7: 起動して、正常系と異常系を並べて叩く
await withServer(app, async (base) => {
  console.log("STEP 7: サーバ起動 →", base);
  console.log("  正常(?q=夏目漱石&limit=1):", fmt(await hit(`${base}/api/books?q=夏目漱石&limit=1`)));
  console.log("  page が数値でない        :", fmt(await hit(`${base}/api/books?page=abc`)));
  console.log("  limit が上限超え         :", fmt(await hit(`${base}/api/books?limit=999999`)));
  console.log("  POST 正常                :", fmt(await hit(`${base}/api/books`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "人間失格", author: "太宰治" }),
  })));
  console.log("  POST author 欠落         :", fmt(await hit(`${base}/api/books`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "人間失格" }),
  })));
});
//   ★ 概念1では 404 になっていた「壊れたリクエスト」が、ここでは 400 +
//     「どの項目がなぜダメか」まで返るようになりました。画面側はこれを見て
//     入力欄の下に赤字を出せます。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) ?page=2 と送ったとき、検証済みの query.page の typeof は "string"? "number"?
//       (z.coerce.number() が何をするか思い出してください)
//   (2) ?q=cat&q=dog のように **同じキーを2回** 送ったら、q は何になる?
//       ListQuerySchema は q: z.string() を期待しています。200? 400?
//   (3) POST で **Content-Type ヘッダを付けずに** JSON文字列を送ったら、
//       req.body は? そしてステータスは何番になる?
//   (4) ?limit=20.5 は通る? (.int() が入っています)
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
await withServer(app, async (base) => {
  console.log("変えてみる (1) ?page=2      :", fmt(await hit(`${base}/api/books?page=2&limit=2`)));
  console.log("変えてみる (2) 同じキー2回  :", fmt(await hit(`${base}/api/books?q=cat&q=dog`)));
  console.log("変えてみる (3) CT なし POST :", fmt(await hit(`${base}/api/books`, {
    method: "POST", body: JSON.stringify({ title: "人間失格", author: "太宰治" }),
  })));
  console.log("変えてみる (4) ?limit=20.5  :", fmt(await hit(`${base}/api/books?limit=20.5`)));
});
//   ※ (2) が 400 になるのは「配列が来たが文字列を期待していた」から。
//     これこそが「型が化け物になる」問題を zod が引き受けてくれている証拠です。
//     配列も許したいなら z.union([z.string(), z.array(z.string())]) のように書きます。
//   ※ (3) は Content-Type が無いので express.json() が本文を無視 → req.body は undefined
//     → CreateBookSchema.safeParse(undefined) が失敗 → 400。
//     例外で 500 にならず、きちんと 400 で説明が返るのが「入口検証がある」状態です。

// --- 書いてみる ---------------------------------------------------------
// 課題: パス変数 :id を検証するスキーマ IdParamSchema を書いてください。
//   ・受け取るのは { id: "..." } という形のオブジェクト(req.params の中身)
//   ・id は「1以上の整数」であること。ただし **文字列で届く** ので変換が要る
//   ・"abc" や "0" や "1.5" は弾かれて 400 になるようにする
// ヒント(概念レベル): z.object の中にキー1つ。文字列を数値として扱いたいときの
//   zod の書き方(STEP 3 で使ったもの)を思い出してください。
let IdParamSchema: z.ZodType | null = null;
// ここに書く(IdParamSchema に z.object({ ... }) を代入する)

// 判定用のアプリ(書き換え不要): 上のスキーマを使って 400 / 200 / 404 を出し分ける
//   スキーマを引数で受け取る形にしているのは、未記入(null)のままでも
//   TypeScript の型検査が通るようにするためです(判定の都合であって、解答ではありません)
function createIdApp(schema: z.ZodType | null): express.Express {
  const app = express();
  app.get("/api/books/:id", (req, res) => {
    if (schema === null) {
      res.status(501).json({ error: "not_implemented" }); // 未記入のときの目印
      return;
    }
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_params" });
      return;
    }
    const { id } = parsed.data as { id: number };
    const book = BOOKS.find((b) => b.id === id);
    if (book === undefined) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(book);
  });
  return app;
}
const app2 = createIdApp(IdParamSchema);

let result2: { statuses: number[]; foundBody: unknown } | null = null;
await withServer(app2, async (base) => {
  const ok = await hit(`${base}/api/books/2`);        // 期待 200
  const notNum = await hit(`${base}/api/books/abc`);  // 期待 400
  const zero = await hit(`${base}/api/books/0`);      // 期待 400(1以上でない)
  const gone = await hit(`${base}/api/books/999`);    // 期待 404(形は正しいが存在しない)
  console.log("  判定用リクエスト:", [ok, notNum, zero, gone].map(fmt).join(" | "));
  result2 = { statuses: [ok.status, notNum.status, zero.status, gone.status], foundBody: ok.body };
});

check("概念2: 入口でパス変数を検証する", result2,
  { statuses: [200, 400, 400, 404], foundBody: { id: 2, title: "坊っちゃん", author: "夏目漱石" } },
  "statuses が全部 501 → IdParamSchema が未記入。" +
  "statuses が [400,400,400,400] → 文字列を数値に変換していない(z.number() だけでは \"2\" が通らない)。" +
  "statuses が [200,200,200,404] → 数値変換はしたが範囲や整数の指定が無い(\"abc\" は NaN、\"0\" は 1未満)。" +
  "3番目が 200 → 下限(1以上)の指定が抜けている。" +
  "foundBody が数値の id にならない → 変換後の型が数値であることを確認(検証済み data を使う)");

export {};
