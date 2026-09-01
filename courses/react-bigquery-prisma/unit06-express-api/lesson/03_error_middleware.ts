/* =====================================================================
 * 概念3: 集中エラーハンドリング — 例外を1箇所で受け止め、内部を漏らさない
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念2で「呼び出し側が悪いリクエスト(400)」は片付きました。残るのは
 *   **サーバ側で想定外のことが起きたとき** です。DBが落ちている、BigQuery が
 *   タイムアウトした、null を触ってしまった——実務では必ず起きます。
 *
 *   このとき何もしないと、Express の既定の動きは
 *   「**例外メッセージとスタックトレースをHTMLにしてブラウザに返す**」です。
 *   そこには接続文字列・内部ホスト名・ソースの絶対パス・使っているライブラリと
 *   その行番号が載ります。攻撃者にとってはこれ以上ない地図です。
 *   (このファイルの「変えてみる」で実際に目で見ます)
 *
 *   かといって全ルートに try/catch を書いて回るのは、ルートが30本になった時点で
 *   破綻します。だから **出口を1箇所に集める**。これが集中エラーハンドリングです。
 *   C# で言えば ASP.NET Core の app.UseExceptionHandler("/error") や
 *   自前の ExceptionHandlingMiddleware とまったく同じ役割です。
 *
 * ■ 解説:
 *
 *   ● エラーハンドラの正体は「引数が4つのミドルウェア」
 *       app.use((err, req, res, next) => { ... });
 *            ↑ 第1引数が err。これが目印です。
 *     Express は登録された関数の **引数の数(fn.length)を見て** 、
 *     4つならエラーハンドラ、3つなら通常のミドルウェアだと判断します。
 *     ★ ここが最大の落とし穴: 使わないからといって next を省いて3引数で書くと、
 *       「通常のミドルウェア」として **全リクエストで呼ばれてしまい**、
 *       エラーのときは呼ばれません。使わなくても4つ書く、が鉄則です。
 *       (TypeScript では ErrorRequestHandler 型を明示すると意図が伝わりますが、
 *        型を書いても引数を減らせてしまうので、実行時の挙動が正義です)
 *
 *   ● 登録する場所は「いちばん最後」
 *     ミドルウェアは登録順に並ぶ配管です。エラーハンドラはその **末尾** に置きます。
 *     ルート定義より前に置くと、エラーが起きたときにはもう通り過ぎた後なので
 *     一度も呼ばれません。ASP.NET Core で UseExceptionHandler を
 *     パイプラインの先頭付近に置くのと**逆**なので注意(あちらは「入って→出る」の
 *     往路復路モデル、Express は「上から下へ流れる」モデル)。
 *
 *   ● エラーはどうやってハンドラまで届くのか
 *     3通りあります:
 *       (a) 同期のハンドラの中で throw した      → Express が捕まえる
 *       (b) next(err) を明示的に呼んだ            → 通常の段を飛ばしてエラーハンドラへ
 *       (c) async ハンドラが reject した          → **Express 5 から** 自動で (b) 相当
 *     (c) が Express 5 の目玉です。Express 4 では await の中で例外が出ると
 *     どこにも届かず、リクエストが永久に返らない(ブラウザがハングする)という
 *     有名な事故がありました。だから Express 4 では全ハンドラを
 *     `asyncHandler(fn)` のようなラッパーで包むのが定番でした。
 *     Express 5 ではその儀式が不要です。**async をそのまま書いてよい**。
 *
 *   ● 「想定内の失敗」と「想定外の失敗」を分ける
 *     404 や 409(重複)は、業務的に **想定内** の失敗です。これは呼び出し側に
 *     理由を伝えたい。一方、DB接続失敗は **想定外** で、詳細を伝えてはいけない。
 *     そこで自前の例外クラスを作って区別します:
 *
 *       class HttpError extends Error { status; code; }
 *
 *     C# の「自前 DomainException を作って、ミドルウェアで catch して
 *     ProblemDetails に変換する」パターンと同じです。
 *     エラーハンドラの中では instanceof で分岐します(C# の catch (DomainException e) 相当)。
 *
 *   ● 返してよい情報 / いけない情報
 *       返してよい: 短い機械可読コード("not_found")、想定内エラーの説明、
 *                   問い合わせ用の requestId
 *       返してはダメ: err.message そのまま(接続文字列や内部IPが入る)、
 *                   err.stack(ソースの絶対パスと行番号)
 *     詳細は **サーバのログにだけ** 出します。ログにはたっぷり、返事には最小限。
 *
 *   ● 未定義パスの 404 も統一する
 *     ルートを全部書いた **後ろ** に app.use((req, res) => ...) を1つ置くと、
 *     どのルートにも一致しなかったリクエストがそこに落ちてきます。
 *     概念1で見た「Cannot GET /api/authors」というHTMLを、JSONに統一できます。
 * ===================================================================== */

import express from "express";
import type { ErrorRequestHandler } from "express";
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

// --- 実験用の小道具(概念1・2と同じ・書き換え不要) -------------------------
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
// GOAL: 3種類の失敗(想定内・同期の想定外・非同期の想定外)と未定義パスを、
//       たった2つの受け皿(404用と500用)だけで、漏れなく・漏らさず処理する。

// STEP 1: 想定内の失敗を表す自前の例外クラス
//   readonly を付けたコンストラクタ引数がそのままフィールドになるのは
//   C# 12 のプライマリコンストラクタとよく似た書き方です。
class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message?: string) {
    super(message ?? code);
    this.name = "HttpError";
  }
}

type Book = { id: number; title: string };
const BOOKS: Book[] = [{ id: 1, title: "吾輩は猫である" }, { id: 2, title: "坊っちゃん" }];

const app = express();
app.use(express.json());

// STEP 2: 正常系
app.get("/api/books/:id", (req, res) => {
  const book = BOOKS.find((b) => b.id === Number(req.params.id));
  if (book === undefined) {
    // ★ res で404を返す代わりに「投げる」。ルートの中に分岐が減り、
    //   404の返し方を1箇所(エラーハンドラ)に集約できる
    throw new HttpError(404, "not_found", `book id=${req.params.id} は存在しません`);
  }
  res.json(book);
});

// STEP 3: 同期の想定外エラー(DBドライバが投げてくる例外のつもり)
app.get("/api/crash-sync", () => {
  throw new Error("connect ECONNREFUSED 10.0.2.15:5432 user=app password=hunter2");
});

// STEP 4: 非同期の想定外エラー。Express 5 は async の reject も拾ってくれる
app.get("/api/crash-async", async () => {
  await new Promise((r) => setTimeout(r, 5)); // DBアクセスのつもり
  throw new Error("BigQuery query timed out after 30000ms (project=my-secret-project)");
});

// STEP 5: どのルートにも当たらなかったリクエストの受け皿(ルート定義より後に置く)
app.use((req, res) => {
  res.status(404).json({ error: "route_not_found", path: req.path });
});

// STEP 6: 集中エラーハンドラ。**引数4つ**、**いちばん最後**
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // (a) サーバのログには詳しく出す。実務ではここが唯一の手がかりになる
  console.log(`  [server log] ${req.method} ${req.path} で例外: ${(err as Error).message}`);

  // (b) 想定内(自分で投げた HttpError)は、決めた status とコードをそのまま返す
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code });
    return;
  }
  // (c) express.json() が投げる「JSONが壊れている」等のエラーは status を持っている。
  //     ライブラリ由来だが呼び出し側の責任(4xx)なので、そのまま尊重する
  const status = (err as { status?: unknown }).status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: "invalid_request" });
    return;
  }
  // (d) それ以外はすべて想定外。**中身は一切返さない**
  res.status(500).json({ error: "internal_error" });
};
app.use(errorHandler);

// STEP 7: 起動して4種類を叩く
await withServer(app, async (base) => {
  console.log("STEP 7: サーバ起動 →", base);
  console.log("  正常              :", fmt(await hit(`${base}/api/books/1`)));
  console.log("  想定内(404)      :", fmt(await hit(`${base}/api/books/999`)));
  console.log("  同期の想定外      :", fmt(await hit(`${base}/api/crash-sync`)));
  console.log("  非同期の想定外    :", fmt(await hit(`${base}/api/crash-async`)));
  console.log("  未定義パス        :", fmt(await hit(`${base}/api/unknown`)));
  console.log("  壊れたJSONを POST :", fmt(await hit(`${base}/api/books/1`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{壊れた",
  })));

  // 漏洩していないことを機械的に確認する(実務でもテストに書く価値がある観点)
  const crash = await hit(`${base}/api/crash-sync`);
  const text = JSON.stringify(crash.body);
  console.log("  → 返事にパスワードは含まれる?", text.includes("hunter2"));
  console.log("  → 返事にスタックトレースは含まれる?", text.includes("at "));
});
//   ★ サーバのログには password=hunter2 まで出ているのに、
//     ブラウザに返るのは {"error":"internal_error"} だけ。この非対称が今日の成果です。
//   ※ 最後の「壊れたJSONを POST」は、POST /api/books/1 というルートが無いので
//     本来は未定義パス扱いですが、その手前で express.json() が本文の解析に失敗して
//     status=400 のエラーを投げるため、(c) の分岐に落ちます。
//     「ミドルウェアは順に流れる」を実感できる例です。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) エラーハンドラを **1つも登録しなかった** 場合、/api/crash-sync の
//       ステータスは何番? 本文には何が入る?(JSON? HTML? 何が書いてある?)
//   (2) エラーハンドラを **ルート定義より前** に app.use した場合、
//       /api/crash-sync の本文は (1) と同じ? それとも今日作ったJSON?
//   (3) 引数を3つだけにした「エラーハンドラのつもりの関数」を末尾に置いたとき、
//       (a) 例外が起きたリクエストで、その関数は呼ばれる?
//       (b) どのルートにも当たらないリクエストでは呼ばれる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) エラーハンドラ無しのアプリ
const appNoHandler = express();
appNoHandler.get("/api/crash-sync", () => {
  throw new Error("connect ECONNREFUSED 10.0.2.15:5432 user=app password=hunter2");
});

// (2) 順番を間違えたアプリ(エラーハンドラをルートより前に置いた)
const appWrongOrder = express();
appWrongOrder.use(errorHandler);           // ← 位置が早すぎる
appWrongOrder.get("/api/crash-sync", () => {
  throw new Error("connect ECONNREFUSED 10.0.2.15:5432 user=app password=hunter2");
});

// (3) 引数3つの「エラーハンドラのつもり」
const appThreeArgs = express();
const calledOnPaths: string[] = [];
let firstArgIsRequest = false;
appThreeArgs.get("/api/crash-sync", () => {
  throw new Error("connect ECONNREFUSED 10.0.2.15:5432 user=app password=hunter2");
});
//   書いた本人は「(err, req, res) の3引数エラーハンドラ」のつもり。
//   しかし Express は引数3つを通常のミドルウェアとして扱うので、
//   実際に渡ってくるのは (req, res, next) — 名前だけがズレて、意味が丸ごと変わります。
const looksLikeErrorHandler: express.RequestHandler = (first, second, _third) => {
  firstArgIsRequest = typeof first.method === "string"; // true なら第1引数は err ではなく req
  calledOnPaths.push(first.path);
  second.status(500).json({ error: "この関数はエラーハンドラになっていない", path: first.path });
};
appThreeArgs.use(looksLikeErrorHandler);

//   ※ Express の既定エラーハンドラは、サーバのコンソールにもスタックを全部吐きます。
//     ここでは出力が長くなりすぎるので、この区間だけ console.error を黙らせています。
//     (レッスンの都合であって、実務でやることではありません)
const realConsoleError = console.error;
console.error = () => {};
await withServer(appNoHandler, async (base) => {
  const res = await fetch(`${base}/api/crash-sync`);
  const text = await res.text();
  console.log("変えてみる (1) ハンドラ無し: status =", res.status,
    "/ Content-Type =", res.headers.get("content-type"));
  console.log("変えてみる (1) 本文の先頭200文字 ↓↓↓");
  console.log("  " + text.replace(/\n/g, " ").slice(0, 200));
  console.log("変えてみる (1) パスワードが漏れている?", text.includes("hunter2"),
    "/ ソースの絶対パスが漏れている?", text.includes("/lesson/"));
});
await withServer(appWrongOrder, async (base) => {
  console.log("変えてみる (2) 順番ミス     :", fmt(await hit(`${base}/api/crash-sync`)));
});
await withServer(appThreeArgs, async (base) => {
  console.log("変えてみる (3) 例外が起きた  :", fmt(await hit(`${base}/api/crash-sync`)));
  console.log("変えてみる (3) 未定義のパス  :", fmt(await hit(`${base}/api/anything`)));
  console.log("変えてみる (3) 3引数の関数が呼ばれたパス:", calledOnPaths,
    "/ 第1引数は req だった?", firstArgIsRequest);
});
//   既定ハンドラのログは少し遅れて出るので、待ってから console.error を元に戻す
await new Promise((r) => setTimeout(r, 30));
console.error = realConsoleError;
//   ※ (1) は、実務で最も見たくないレスポンスです。DBのユーザー名・パスワード・
//     内部IP・ソースの絶対パスが、ブラウザの開発者ツールで丸見えになります。
//   ※ (2) の結果が (1) と同じなのは、エラーハンドラが「もう通り過ぎた場所」に
//     いたから。**位置がすべて** です。
//   ※ (3) は「4引数でないとエラーハンドラにならない」ことの実演です。
//     例外が起きたときには呼ばれず(既定ハンドラがHTMLを返した)、
//     逆に **どのルートにも当たらない普通のリクエスト** で呼ばれてしまいました。
//     しかも第1引数には err ではなく req が入っています(firstArgIsRequest=true)。
//     引数の数を1つ間違えるだけで、意味が完全に裏返るということです。

// --- 書いてみる ---------------------------------------------------------
// 課題: 集中エラーハンドラ myErrorHandler を自分で書いてください。仕様:
//   ・err が HttpError(上の STEP 1 のクラス)なら、その status で
//     { error: <err.code> } を返す
//   ・それ以外はすべて 500 で { error: "internal_error" } を返す。
//     **err.message も err.stack も返事に含めないこと**(下で機械的に検査します)
// ヒント(概念レベル): 引数は4つ。instanceof で分岐し、返したら return。
//   res.status(n).json(...) の形は概念1と同じです。
let myErrorHandler: ErrorRequestHandler | null = null;
// ここに書く(myErrorHandler に (err, req, res, next) => { ... } を代入する)

// 判定用のアプリ(書き換え不要)
const app3 = express();
app3.get("/api/crash", () => {
  throw new Error("connect ECONNREFUSED 10.0.2.15:5432 user=app password=hunter2");
});
app3.get("/api/books/:id", () => {
  throw new HttpError(404, "not_found", "その本はありません");
});
if (myErrorHandler !== null) app3.use(myErrorHandler); // 未記入なら登録しない(= Express の既定動作)

let result3: {
  crashStatus: number; crashBody: unknown;
  missingStatus: number; missingBody: unknown;
  leaked: boolean;
} | null = null;
const realConsoleError2 = console.error;
console.error = () => {}; // 未記入時に既定ハンドラが吐く長いスタックを抑えるだけ
await withServer(app3, async (base) => {
  const crash = await hit(`${base}/api/crash`);
  const missing = await hit(`${base}/api/books/999`);
  const dump = JSON.stringify(crash.body) + JSON.stringify(missing.body);
  console.log("  判定用リクエスト:", fmt(crash), "|", fmt(missing));
  result3 = {
    crashStatus: crash.status, crashBody: crash.body,
    missingStatus: missing.status, missingBody: missing.body,
    leaked: dump.includes("hunter2") || dump.includes("at ") || dump.includes("ECONNREFUSED"),
  };
});
await new Promise((r) => setTimeout(r, 30));
console.error = realConsoleError2;

check("概念3: 集中エラーハンドラ", result3,
  {
    crashStatus: 500, crashBody: { error: "internal_error" },
    missingStatus: 404, missingBody: { error: "not_found" },
    leaked: false,
  },
  "body が \"(JSONではない) <!DOCTYPE html...\" → myErrorHandler が未記入で、" +
  "Express の既定ハンドラがHTMLを返している。" +
  "crashStatus は正しいのに leaked が true → 返事に err.message や err.stack を含めている。" +
  "missingStatus が 500 → err instanceof HttpError の分岐が無い(または分岐後の return 忘れ)。" +
  "missingBody が {\"error\":\"その本はありません\"} → 返すのは err.message ではなく err.code。" +
  "両方 500 で正常リクエストまで壊れる → 引数を4つ書いていない可能性(3つだと通常ミドルウェア扱い)");

export {};
