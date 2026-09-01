/* =====================================================================
 * 概念5: なぜ間に1枚挟むのか — Vite の VITE_ の罠と、CORS
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit01 の概念1で、このコース最重要の線を引きました。
 *
 *       許可される矢印:  ブラウザ → 自前バックエンド → データストア
 *       禁止される矢印:  ブラウザ → データストア(直結)
 *
 *   概念1〜4で「自前バックエンド」を実際に組み上げました。最後に、
 *   **その線を守らなかったら具体的に何が起きるのか** を目で見て終わります。
 *
 *   「鍵をフロントに置かない」は、頭では誰でも同意します。事故が起きるのは
 *   たいてい **「置いたつもりがない」** ときです。典型的なのがこれ:
 *
 *       // .env に書いただけ。ソースに直書きしていないから安全…?
 *       VITE_BIGQUERY_KEY=...
 *       // React 側
 *       const key = import.meta.env.VITE_BIGQUERY_KEY;
 *
 *   `.env` に書いて `process.env` 的なものから読んでいるので、一見すると
 *   unit01 で習った「秘密は環境変数で外から渡す」を守っているように見えます。
 *   ところが Vite の場合、**この値はビルド時にJSファイルへ文字列として焼き込まれます**。
 *   このファイルでは、実際に Vite でビルドして出来上がった .js を開き、
 *   鍵が平文で入っていることを文字列検索で確認します。
 *
 * ■ 解説:
 *
 *   ● そもそも「フロントの環境変数」とは何か
 *     Node のサーバは実行時に process.env を読めます(実行しているマシンのOSに
 *     環境変数があるから)。しかし **ブラウザにOSの環境変数はありません**。
 *     では import.meta.env.VITE_XXX はどこから来るのか? 答え:
 *     **ビルド時に、ただの文字列リテラルへ置換されている** のです。
 *
 *       ビルド前:  const k = import.meta.env.VITE_API_BASE_URL;
 *       ビルド後:  const k = "http://localhost:3000";
 *
 *     C# で言えば、実行時の設定読み込みではなく **コンパイル時の #define / 定数畳み込み**
 *     に近い。つまり値はソースコードの一部になります。
 *     配信された .js は誰でもダウンロードできるので、これは「公開」と同義です。
 *
 *   ● VITE_ プレフィックスの意味
 *     Vite は .env の中身を無差別に埋め込むわけではなく、
 *     **VITE_ で始まる変数だけ** をクライアント側に露出します。それ以外(DATABASE_URL など)は
 *     import.meta.env から読もうとしても undefined に置換されます。
 *     ここを勘違いしないでください:
 *
 *       VITE_ は「秘密を守る仕組み」ではなく、「うっかり全部漏れるのを防ぐ最後の柵」。
 *       VITE_ を付けるという行為は **「これは公開してよい」と宣言すること** です。
 *
 *     Next.js の NEXT_PUBLIC_、Create React App の REACT_APP_ も同じ設計です。
 *     名前に PUBLIC と書いてある Next.js のほうが誤解が少ない、とよく言われます。
 *
 *   ● VITE_ に入れてよいもの / だめなもの
 *       入れてよい: APIのベースURL、機能フラグ、公開用の解析ID、ビルド番号
 *       絶対だめ  : GCPサービスアカウント鍵、DB接続文字列、外部APIの秘密鍵、
 *                   管理者パスワード、署名用シークレット
 *     判断基準は1つ:「これを全世界の掲示板に貼っても平気か?」
 *
 *   ● 正しい形(今日作ったものがそれ)
 *       ブラウザ:  fetch("/api/summary")            ← 鍵を一切知らない
 *       Express :  process.env.GOOGLE_APPLICATION_CREDENTIALS を使って BigQuery を叩き、
 *                  **集計結果だけ** を JSON で返す
 *     鍵はサーバプロセスのメモリから外に出ません。ついでに、ブラウザから任意のSQLを
 *     投げられる余地も消えます(叩けるのは自分が定義したエンドポイントだけ)。
 *
 *   ● CORS(Cross-Origin Resource Sharing)
 *     開発中は React が http://localhost:5173(Vite の開発サーバ)、
 *     API が http://localhost:3000(Express)で動きます。ポートが違うので
 *     ブラウザから見ると **別のオリジン** です。
 *     ブラウザには「同一オリジンポリシー」という安全装置があり、
 *     別オリジンへの fetch の結果は既定で **JSに渡されません**
 *     (リクエスト自体は飛び、レスポンスも返ってくるが、ブラウザが捨てる)。
 *
 *     これを解除する唯一の方法が、**サーバ側が「このオリジンからならいいよ」と
 *     ヘッダで明言する** ことです:
 *
 *       Access-Control-Allow-Origin: http://localhost:5173
 *
 *     その付与を自動化するのが cors パッケージ:
 *       import cors from "cors";
 *       app.use(cors({ origin: "http://localhost:5173" }));   // 許可先を明示する
 *       app.use(cors());                                       // 全オリジン許可(開発でも避けたい)
 *
 *     また、GET/POST 以外や独自ヘッダを使う場合、ブラウザは本番のリクエストの前に
 *     **プリフライト(OPTIONS メソッドの事前問い合わせ)** を自動で送ります。
 *     cors パッケージはこれにも自動で 204 + 許可ヘッダを返してくれます。
 *
 *     ★ 誤解しやすい最重要ポイント:
 *       CORS は **ブラウザの中でしか効きません**。curl や Node の fetch、
 *       Postman には一切効きません。つまり CORS は「サーバを守る仕組み」ではなく
 *       「利用者のブラウザが、悪意あるサイトに勝手にAPIを使われないようにする仕組み」。
 *       認証・認可の代わりには絶対になりません。
 *       (このファイルの「変えてみる」で、Node の fetch が CORS を完全に無視するのを見ます)
 *
 *     ちなみに本番では、Express が React のビルド成果物も配信する(= 同一オリジン)か、
 *     リバースプロキシで同じドメインにまとめるのが普通で、その場合 CORS 自体が不要になります。
 * ===================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import cors from "cors";
import { build } from "vite";
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

// --- 実験用の小道具(概念1〜4と同じ・書き換え不要) -------------------------
async function withServer(app: express.Express, fn: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「.env に書いた鍵が、ビルド後のJSに平文で入っている」ことを自分の目で確認し、
//       正しい形(サーバが鍵を握り、結果だけ返す)との差を体で覚える。

// STEP 1: 使い捨ての小さなフロントエンドを一時ディレクトリに作る
//   (コースの本物の .env を汚さないため。やっていることは実プロジェクトと同じです)
const SERVICE_KEY = "sk_live_51H8x_THIS_IS_A_SECRET_SERVICE_ACCOUNT_KEY";
const DB_PASSWORD = "P@ssw0rd_DB_SECRET";

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "unit06-vite-trap-"));
fs.mkdirSync(path.join(projectDir, "src"));
fs.writeFileSync(path.join(projectDir, ".env"), [
  "# 公開してよい設定(APIの場所)",
  "VITE_API_BASE_URL=http://localhost:3000",
  "# ★ やってはいけない例: 鍵に VITE_ を付けてしまった",
  `VITE_SERVICE_ACCOUNT_KEY=${SERVICE_KEY}`,
  "# VITE_ が付いていない = クライアントには露出しないはずの変数",
  `DATABASE_URL=postgres://app:${DB_PASSWORD}@db.internal:5432/app`,
  "",
].join("\n"), "utf8");

//   フロント側のソース。React だと思って読んでください(unit07 の予告編です)
fs.writeFileSync(path.join(projectDir, "src/main.ts"), [
  "const apiBase = import.meta.env.VITE_API_BASE_URL;",
  "const serviceKey = import.meta.env.VITE_SERVICE_ACCOUNT_KEY;",
  "const dbUrl = import.meta.env.DATABASE_URL;",
  "console.log(apiBase, serviceKey, dbUrl);",
  "",
].join("\n"), "utf8");
console.log("STEP 1: 使い捨てフロントを作成 →", projectDir);
console.log("STEP 1: .env の中身 ---");
console.log(fs.readFileSync(path.join(projectDir, ".env"), "utf8").trimEnd());
console.log("STEP 1: ---");

// STEP 2: 本番ビルドする(npm run build と同じことを、プログラムから呼んでいるだけ)
const outDir = path.join(projectDir, "dist");
async function buildFrontend(minify: boolean): Promise<string> {
  await build({
    root: projectDir,
    logLevel: "silent",
    build: {
      outDir, emptyOutDir: true, minify,
      lib: { entry: path.join(projectDir, "src/main.ts"), formats: ["es"], fileName: "bundle" },
    },
  });
  const file = fs.readdirSync(outDir).find((f) => f.endsWith(".mjs") || f.endsWith(".js"))!;
  return fs.readFileSync(path.join(outDir, file), "utf8");
}
const bundle = await buildFrontend(false);

// STEP 3: 出来上がったJS(= ブラウザに配られるファイル)を開く
console.log("STEP 3: ビルド成果物の中身 ↓↓↓(これが全世界に配信されるファイルです)");
for (const line of bundle.split("\n").filter((l) => l.trim() !== "" && !l.startsWith("//"))) {
  console.log("   | " + line);
}

// STEP 4: 文字列検索して、何が焼き込まれたかを機械的に確かめる
console.log("STEP 4: サービスアカウント鍵は含まれている?", bundle.includes(SERVICE_KEY), "  ← ★");
console.log("STEP 4: DBパスワードは含まれている?      ", bundle.includes(DB_PASSWORD));
console.log("STEP 4: APIのベースURLは含まれている?    ", bundle.includes("http://localhost:3000"));
//   ★ VITE_ を付けた鍵は **文字列リテラルとしてソースに埋め込まれています**。
//     難読化も暗号化もされていません。F12 → Sources で誰でも読めます。
//     一方 VITE_ の付いていない DATABASE_URL は undefined に置換されて消えています。

// STEP 5: 正しい形 — 鍵はサーバが握り、ブラウザには結果だけ返す
process.env.DEMO_SERVICE_ACCOUNT_KEY = SERVICE_KEY; // 本来は .env / CI の秘密から入る(unit01)
const apiApp = express();
apiApp.get("/api/summary", (_req, res) => {
  const key = process.env.DEMO_SERVICE_ACCOUNT_KEY; // ← この値はサーバのメモリから出ない
  if (key === undefined) { res.status(500).json({ error: "internal_error" }); return; }
  // 本番ではこの鍵で BigQuery を叩く(unit05)。今日は叩いたことにして集計値だけ返す
  res.json({ totalBooks: 3, totalBorrows: 47, generatedBy: "server" });
});
await withServer(apiApp, async (base) => {
  const text = await (await fetch(`${base}/api/summary`)).text();
  console.log("STEP 5: ブラウザが受け取る本文 =", text);
  console.log("STEP 5: その中に鍵は含まれている?", text.includes(SERVICE_KEY));
});
//   ★ ブラウザは「集計結果」しか知りません。鍵も、SQLも、DBのホスト名も知らない。
//     これが概念1〜4で作ってきたバックエンドの存在理由そのものです。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) minify(圧縮・難読化)を有効にして本番ビルドしたら、鍵の文字列は消える?
//       それとも残る?
//   (2) cors を入れていない Express サーバに、**Node の fetch** から
//       Origin ヘッダ付きでアクセスしたら、失敗する? 成功する?
//   (3) cors({ origin: "http://localhost:5173" }) を入れたサーバに、
//       Origin: http://evil.example から fetch したら、Node 側の fetch は失敗する?
//       そのときレスポンスヘッダ access-control-allow-origin はどうなる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) 圧縮してもう一度ビルド
const minified = await buildFrontend(true);
console.log("変えてみる (1) 圧縮後のサイズ =", minified.length, "文字");
console.log("変えてみる (1) 圧縮後の中身   =", minified.split("\n").filter((l) => !l.startsWith("//")).join(" ").trim());
console.log("変えてみる (1) 鍵はまだ含まれている?", minified.includes(SERVICE_KEY), "  ← ★");

// (2)(3) CORS の挙動
const noCors = express();
noCors.get("/api/ping", (_req, res) => { res.json({ ok: true }); });
await withServer(noCors, async (base) => {
  const res = await fetch(`${base}/api/ping`, { headers: { Origin: "http://localhost:5173" } });
  console.log("変えてみる (2) cors 無し: status =", res.status,
    "/ allow-origin ヘッダ =", res.headers.get("access-control-allow-origin"),
    "/ 本文 =", await res.text());
});

const withCors = express();
withCors.use(cors({ origin: "http://localhost:5173" })); // 許可するオリジンを明示
withCors.get("/api/ping", (_req, res) => { res.json({ ok: true }); });
await withServer(withCors, async (base) => {
  const allowed = await fetch(`${base}/api/ping`, { headers: { Origin: "http://localhost:5173" } });
  console.log("変えてみる (3) 許可オリジン: allow-origin =", allowed.headers.get("access-control-allow-origin"));
  const evil = await fetch(`${base}/api/ping`, { headers: { Origin: "http://evil.example" } });
  console.log("変えてみる (3) 別オリジン  : status =", evil.status,
    "/ allow-origin =", evil.headers.get("access-control-allow-origin"),
    "/ 本文 =", await evil.text());
  // プリフライト(ブラウザが本番リクエストの前に自動で送るもの)を手で再現してみる
  const preflight = await fetch(`${base}/api/ping`, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "DELETE" },
  });
  console.log("変えてみる (3) プリフライト: status =", preflight.status,
    "/ allow-methods =", preflight.headers.get("access-control-allow-methods"));
});
//   ※ (1) 圧縮は「変数名を短くする」だけで、**文字列リテラルは何も変わりません**。
//     難読化はセキュリティではない、の実例です。
//   ※ (2)(3) Node の fetch は **どの場合も 200 で本文まで読めています**。
//     許可していないオリジン(evil.example)から来ても、サーバは普通に処理して返しています。
//     変わったのは access-control-allow-origin ヘッダの有無と、その **値** だけ:
//       cors 無し           → ヘッダ自体が無い
//       cors(5173を許可)   → 誰から来ても "http://localhost:5173" と書いて返す
//     ブラウザはこの値と「自分のオリジン」を突き合わせ、一致しなければ
//     受け取ったレスポンスを **JSに渡さずに捨てます**。つまり判定しているのはブラウザで、
//     サーバは何も拒否していません。CORS が「サーバの防御」ではないとはこの意味です。
//     API を守るのは認証・認可(これは今回のコースの範囲外ですが、いつか必ず必要になります)。

// 後片付け: 一時ディレクトリを消す
fs.rmSync(projectDir, { recursive: true, force: true });
delete process.env.DEMO_SERVICE_ACCOUNT_KEY;

// --- 書いてみる ---------------------------------------------------------
// 課題: buildPublicConfig(env) を書いてください。
//   サーバが持っている環境変数の一覧から、**ブラウザに渡してよいものだけ** を残した
//   新しいオブジェクトを返します。残す条件は次の2つを **両方** 満たすこと:
//     ① キーが "VITE_" で始まる
//     ② キーに SECRET / KEY / PASSWORD / TOKEN / CREDENTIALS のいずれも含まれない
//        (VITE_ を付けてしまった鍵を、もう一段の柵で止めるため)
//   ・キーの順番は元の env と同じ順にしてください
//   ・大文字小文字は考えなくて構いません(このデータはすべて大文字です)
// ヒント(概念レベル): Object.entries(env) で [キー, 値] の配列にすると、
//   filter と、その結果を Object.fromEntries でオブジェクトに戻す形が使えます。
//   (for...of で1件ずつ結果オブジェクトに詰めても正解です)
//   C# なら env.Where(kv => ...).ToDictionary(kv => kv.Key, kv => kv.Value) 相当。
const SERVER_ENV: Record<string, string> = {
  VITE_API_BASE_URL: "http://localhost:3000",
  DATABASE_URL: "file:./data/app.db",
  VITE_FEATURE_NEW_SEARCH: "true",
  VITE_SERVICE_ACCOUNT_KEY: "sk_live_51H8x_secret",
  GOOGLE_APPLICATION_CREDENTIALS: "/home/you/.gcp/key.json",
  VITE_BUILD_NUMBER: "1042",
  EXTERNAL_API_TOKEN: "tok_abc123",
  VITE_ADMIN_PASSWORD: "hunter2",
};

function buildPublicConfig(env: Record<string, string>): Record<string, string> | null {
  // ここに書く(条件を満たすキーだけを持つオブジェクトを return する)
  return null; // 未実装の目印(書けたらこの行は消す)
}

const result5 = buildPublicConfig(SERVER_ENV);

check("概念5: 公開してよい設定だけを選ぶ", result5,
  { VITE_API_BASE_URL: "http://localhost:3000", VITE_FEATURE_NEW_SEARCH: "true", VITE_BUILD_NUMBER: "1042" },
  "null のまま → 未実装。DATABASE_URL などが残っている → VITE_ で始まるかの判定が無い" +
  "(文字列の startsWith が使えます)。VITE_SERVICE_ACCOUNT_KEY や VITE_ADMIN_PASSWORD が" +
  "残っている → 危険な語(SECRET/KEY/PASSWORD/TOKEN/CREDENTIALS)を含むキーを除く条件が抜けている" +
  "(includes で1語ずつ調べる、または some で一括判定)。" +
  "キーは合っているのに [NG] → 順番が違う可能性(元の env の順で詰め直す)");

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 * ・「なぜブラウザから直接DBやBigQueryを叩かないのか」を、後輩に説明するつもりで:
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */

/* =====================================================================
 * まとめと次へ
 * ---------------------------------------------------------------------
 * 概念                  一言で                                     C# で言うと
 * ルーティング          app.get/post(パス, (req,res)=>...)。       MapGet / Controller
 *                       値は req.params(常に文字列) / req.query /  [FromRoute]/[FromQuery]/
 *                       req.body。返すのは res.status(n).json(x)   [FromBody] / Ok(),NotFound()
 * ステータス設計        201=作成、400=呼び出し側が悪い、            —
 *                       404=無い、500=サーバが悪い
 * ミドルウェア          (req,res,next) を順に流す配管。            app.Use のパイプライン
 *                       express.json() が req.body を作る          入力フォーマッタ
 * 入口検証             zod で safeParse → 失敗は 400 + issues。   DataAnnotations +
 *                       通った後は検証済み data しか使わない        ProblemDetails
 * 集中エラーハンドラ    引数4つ・いちばん最後。HttpError は翻訳、   UseExceptionHandler /
 *                       想定外は 500 で中身を返さない               自前 ExceptionMiddleware
 *                       Express 5 は async の例外も自動で回す
 * 層分離                route(HTTP変換)→ service(ユースケース) Controller → Service →
 *                       → repository(ストアを隠す)。依存は一方通行 Repository
 * 依存性注入            createApp(deps) に repository を渡す。      DIコンテナ登録
 *                       テストでは fake に差し替え → DB不要          (ここは手渡し = Pure DI)
 * 鍵の境界              VITE_ 付き環境変数はビルド後のJSに平文で    #define / 定数畳み込み
 *                       焼き込まれる。VITE_ = 公開宣言。
 *                       鍵はサーバのみ、ブラウザには結果だけ返す
 * CORS                  別オリジンを許可するヘッダをサーバが出す。  CORSポリシー
 *                       ブラウザの中でしか効かない(認可ではない)
 *
 * この先どこで使うか:
 * ・unit07(React): ついにブラウザ側を書きます。今日作った /api/books を
 *   React から fetch して画面に並べます。そのとき出てくるのが
 *   「開発中は 5173 と 3000 でオリジンが違う」問題 — 今日の cors、あるいは
 *   Vite の proxy 設定で解決します。「なぜ画面から直接BigQueryを呼ばないのか」に
 *   もう迷わないはずです。
 * ・unit08(総合): 取り込みジョブ → Prisma/BigQuery → 今日のAPI → React、の全部を
 *   1本に繋ぎます。今日の createApp(deps) の deps に、fake ではなく
 *   本物の Prisma 実装と BigQuery 実装が入る、という形で合流します。
 *
 * 次: 演習へ。lesson を見ながらで OK。
 *   ex01_first_route     … ルートとステータスコード(概念1)
 *   ex02_validate_query  … zod による入口検証と 400(概念2)
 *   ex03_error_layering  … 集中エラーハンドラと層分離(概念3・4)
 *   ex04_capstone        … createApp(deps) で全部入りのAPIを1本(概念1〜5)
 *   テストは cwd を courses/react-bigquery-prisma/ にして:
 *     npx vitest run unit06-express-api/tests
 * ===================================================================== */
