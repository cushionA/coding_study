/* =====================================================================
 * 概念4: .env と process.env — 秘密情報の置き場所と、境界線の実装
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念1で「鍵はバックエンドより内側だけ」という線を引きました。
 *   では実際に、その鍵をコードにどう渡すのか。答えは「ソースに書かない。
 *   環境変数で外から渡す」です。unit05 で GCP のサービスアカウント鍵、
 *   unit03 で DB の接続文字列、unit02 で外部APIのトークンを扱いますが、
 *   全部この仕組みに乗ります。
 *   実務での事故の代表格が「鍵をベタ書きしたファイルをうっかりコミット →
 *   リポジトリの履歴に永久に残る → 鍵の再発行」です。git の履歴は
 *   後から消すのが極めて面倒なので、最初から入れない運用にします。
 *
 * ■ 解説:
 *   ● 環境変数とは
 *     OS がプロセスに渡す「名前 → 文字列」の辞書です。Node では process.env で
 *     読めます。型は Record<string, string | undefined>、つまり
 *     **値は常に文字列で、常に undefined の可能性がある**。
 *     C# の Environment.GetEnvironmentVariable(name) が string? を返し、
 *     数値が欲しければ int.Parse するのと完全に同じ状況です。
 *     ここを「あるはず」と決め打ちすると、本番だけ undefined で落ちます。
 *
 *   ● .env ファイルと dotenv
 *     開発中に毎回 shell で環境変数を設定するのは面倒なので、
 *     プロジェクト直下の .env というテキストファイルに KEY=value 形式で書き、
 *     起動時に読み込んで process.env に流し込みます。それをやるのが
 *     dotenv パッケージです。C# で言えば appsettings.Development.json や
 *     User Secrets に相当する立ち位置。
 *
 *       import dotenv from "dotenv";
 *       dotenv.config();                       // 既定で cwd の .env を読み、process.env に注入
 *       dotenv.config({ path: "..." });        // 場所を指定することもできる
 *       dotenv.parse(バッファ or 文字列);       // パースするだけ。process.env は変えない
 *
 *     重要な性質: dotenv は **既に process.env にある値を上書きしません**。
 *     「本物の環境変数(本番の設定・CIの秘密)が最優先、.env はあくまで開発時の補助」
 *     という優先順位になっています。
 *
 *   ● 運用のルール(これがこのユニットの成果物)
 *     1. .env は **.gitignore に入れる**。絶対にコミットしない。
 *     2. 代わりに .env.example を **キー名だけ・値は空でコミット**する。
 *        新しく参加した人が「何を設定すればいいか」を知るための目次になる。
 *     3. 鍵ファイル(GCPのJSON鍵など)はリポジトリの外に置き、
 *        .env にはその**パスだけ**を書く(中身はリポジトリに入れない)。
 *     4. 必須の設定が無いときは **起動時に例外で落とす**。
 *        実行の途中で undefined が混ざって謎の挙動をするより、
 *        起動直後に「DB_URL が設定されていません」と落ちるほうが100倍デバッグしやすい。
 *        これを fail fast と呼びます。
 *     5. そして境界: この値はすべて **サーバプロセスの中だけ**のもの。
 *        ブラウザに配る JavaScript には絶対に入れません。
 *        (unit06 で扱いますが、Vite は VITE_ で始まる環境変数を
 *         ビルド後の JS に文字列として埋め込みます。そこに鍵を書けば公開と同義)
 *
 *   ■ このファイルの実行環境について:
 *     コースの本物の .env を汚さないよう、OS の一時ディレクトリに
 *     使い捨ての .env を作って読み込みます(node:fs の mkdtempSync)。
 *     実務では path を指定せず dotenv.config() だけ呼べば、プロジェクト直下の
 *     .env が読まれます。やっていることは同じです。
 * ===================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

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
// GOAL: .env が process.env に載るまでを1ステップずつ見て、
//       string | undefined をどう安全に扱うか(既定値・必須チェック・数値変換)を身につける

// STEP 0: このレッスンを何度実行しても同じ結果になるよう、デモで使うキーを一旦消しておく
//   (process.env はただのオブジェクトなので delete でキーを消せる。実務ではやりません)
for (const key of ["DB_URL", "PAGE_SIZE", "MAX_RETRY", "LOG_LEVEL", "BQ_DATASET", "APP_PORT"]) {
  delete process.env[key];
}

// STEP 1: 何もしない状態で process.env を読むと undefined。型も string | undefined
const before: string | undefined = process.env.DB_URL;
console.log("STEP 1: 読み込み前の process.env.DB_URL =", before, "/ typeof =", typeof before);

// STEP 2: 使い捨ての .env を一時ディレクトリに作る(中身は実務でよくある形)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unit01-env-"));
const envPath = path.join(tmpDir, ".env");
fs.writeFileSync(envPath, [
  "# アプリDBの接続先(unit03 で Prisma が読む)",
  "DB_URL=file:./data/app.db",
  "PAGE_SIZE=50",
  "# GCP のサービスアカウント鍵は「パスだけ」を書く。鍵ファイル本体はリポジトリの外",
  "GOOGLE_APPLICATION_CREDENTIALS=/home/you/.gcp/bq-study-key.json",
  "",
].join("\n"), "utf8");
console.log("STEP 2: 作った .env の中身 ---");
console.log(fs.readFileSync(envPath, "utf8").trimEnd());
console.log("STEP 2: ---");

// STEP 3: parse は「解釈するだけ」。process.env はまだ変わらない
const parsed = dotenv.parse(fs.readFileSync(envPath));
console.log("STEP 3: parse の結果 =", parsed);
console.log("STEP 3: parse 後の process.env.DB_URL =", process.env.DB_URL, "(まだ undefined)");

// STEP 4: config は process.env に注入する。ここで初めて読めるようになる
dotenv.config({ path: envPath, quiet: true }); // quiet: true は起動ログを黙らせるだけの指定
console.log("STEP 4: config 後の process.env.DB_URL =", process.env.DB_URL);
console.log("STEP 4: PAGE_SIZE =", process.env.PAGE_SIZE, "/ typeof =", typeof process.env.PAGE_SIZE);
//   ↑ .env に 50 と書いても、取り出せるのは文字列 "50"。数値が欲しければ自分で変換する

// STEP 5: string | undefined を安全に扱う3つの型
//   (a) 必須 → 無ければ即座に落とす(fail fast)
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`必須の環境変数 ${name} が設定されていません。.env を確認してください`);
  }
  return value; // ここを通ったら型は string(undefined は消えている)
}
//   (b) 任意 → 無ければ既定値。?? は「左が null/undefined のときだけ右を使う」演算子(C# の ??)
const logLevel: string = process.env.LOG_LEVEL ?? "info";
//   (c) 数値が欲しい → Number() で変換。変換できないと NaN になるので確認する
const pageSize: number = Number(process.env.PAGE_SIZE ?? "20");

console.log("STEP 5 (a): requireEnv('DB_URL') =", requireEnv("DB_URL"));
console.log("STEP 5 (b): LOG_LEVEL(.env に無いので既定値) =", logLevel);
console.log("STEP 5 (c): PAGE_SIZE を数値化 =", pageSize, "/ typeof =", typeof pageSize);
try {
  requireEnv("BQ_DATASET"); // .env に書いていないキー
} catch (err) {
  console.log("STEP 5 (a): 必須が欠けたとき →", (err as Error).message);
}

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) すでに process.env.DB_URL に値が入っている状態で、別の値を書いた .env を
//       dotenv.config() で読み込んだら、DB_URL はどちらの値になる?
//       (本番サーバの環境変数と、開発用の .env が両方ある状況を想像してください)
//   (2) .env に APP_PORT=  (値が空)と書いた場合、process.env.APP_PORT は undefined? 空文字 ""?
//       そして Number(process.env.APP_PORT ?? "3000") はいくつになる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const envPath2 = path.join(tmpDir, ".env.second");
fs.writeFileSync(envPath2, "DB_URL=file:./data/OVERWRITTEN.db\nAPP_PORT=\n", "utf8");

console.log("変えてみる: 読み込み前の DB_URL =", process.env.DB_URL);
dotenv.config({ path: envPath2, quiet: true });
console.log("変えてみる (1): 読み込み後の DB_URL =", process.env.DB_URL);
console.log("変えてみる (2): APP_PORT =", JSON.stringify(process.env.APP_PORT),
  "/ typeof =", typeof process.env.APP_PORT);
console.log("変えてみる (2): Number(APP_PORT ?? '3000') =", Number(process.env.APP_PORT ?? "3000"));
//   ※ (2) の結果は「?? は undefined のときしか既定値に落ちない」ことの実例です。
//     空文字は「値がある」扱いなので既定値に落ちません。requireEnv で value === "" も
//     弾いているのは、この落とし穴を塞ぐためです。

// --- 書いてみる ---------------------------------------------------------
// 課題: readConfig() を完成させてください。process.env から読んで AppConfig を返します。
//       ・dbUrl    … 環境変数 DB_URL。**必須**(無ければ例外。requireEnv が使える)
//       ・pageSize … 環境変数 PAGE_SIZE を数値にしたもの。無ければ 20
//       ・maxRetry … 環境変数 MAX_RETRY を数値にしたもの。無ければ 3
//                    (MAX_RETRY は .env に書いていないので、既定値が効くはず)
// ヒント(概念レベル): 必須は requireEnv、任意は ?? で既定値を用意してから Number() で数値化。
//   「?? を先に、Number() を後に」の順番がポイントです。
type AppConfig = { dbUrl: string; pageSize: number; maxRetry: number };

function readConfig(): AppConfig | null {
  // ここに書く(AppConfig を return する。書けたら下の「未実装の目印」の行は消す)
  return null; // 未実装の目印
}

let result4: AppConfig | null = null;
try {
  const cfg = readConfig();
  // 判定時にキーの並び順をそろえるため、ここで詰め直しています(比較の都合であって解答ではありません)
  if (cfg !== null) result4 = { dbUrl: cfg.dbUrl, pageSize: cfg.pageSize, maxRetry: cfg.maxRetry };
} catch (err) {
  console.log("  (readConfig が例外を投げました:", (err as Error).message, ")");
}

check("概念4: 環境変数から設定を組み立てる", result4,
  { dbUrl: "file:./data/app.db", pageSize: 50, maxRetry: 3 },
  "result4 が null → 未実装。pageSize が NaN → Number() に undefined を渡している(?? を先に)。" +
  "pageSize が \"50\" のような文字列 → Number() を通していない。maxRetry が NaN → " +
  "MAX_RETRY は未設定なので ?? \"3\" のように既定値が要る。" +
  "dbUrl が OVERWRITTEN になった人はいないはず — dotenv は既にある値を上書きしないので、" +
  "1つ目の .env で入った file:./data/app.db が残っています(予測(1)の答え)");

// 後片付け: 一時ディレクトリを消す
fs.rmSync(tmpDir, { recursive: true, force: true });

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
 * 概念              一言で                                        C# で言うと
 * 3層構成の地図      ブラウザ → 自前バックエンド → データストア。    ---
 *                    鍵と接続情報はバックエンドより内側だけ。
 *                    ブラウザ→データストア直結は禁止
 * Promise/async     Promise<T> は「いずれ T が入る入れ物」。         Task<T> / async Task<T>
 *                    async 関数は必ず Promise を返す。await で中身。  await
 *                    付け忘れると Promise がそのまま流れる(NaN の元)
 * Promise.all       複数の待ちを同時に走らせて全部揃うまで待つ。      Task.WhenAll
 *                    1つ失敗すると全体が失敗
 * fetch / Response  fetch は Promise<Response>。ok/status を         HttpClient.GetAsync /
 *                    **自分で見る**(404/500 でも例外は飛ばない)。    EnsureSuccessStatusCode
 *                    本文は await response.json() でもう1段
 * any を型に落とす   json() は any。as は無検査の宣言でしかない       (as は実行時ノーチェック)
 * .env / process.env 秘密はソースに書かず環境変数で外から渡す。       Environment.
 *                    値は常に string | undefined。必須は起動時に落とす GetEnvironmentVariable /
 *                    .env は .gitignore、.env.example をコミット      appsettings + User Secrets
 *
 * この先どこで使うか:
 * ・unit02: 今日の fetch + as Book[] の「無検査の穴」を zod の safeParse で塞ぎます。
 *   さらに Promise と try/catch を土台に、指数バックオフのリトライと
 *   AbortSignal.timeout によるタイムアウトを書きます(sleep が再登場します)。
 * ・unit03/04: Prisma のメソッドはすべて Promise を返します。await 無しで
 *   findMany() を呼ぶと Promise の配列でない何かが流れてくる、という今日のバグが
 *   そのまま起きます。DB接続文字列は今日の .env から読みます。
 * ・unit05: GCP のサービスアカウント鍵は GOOGLE_APPLICATION_CREDENTIALS という
 *   決まった名前の環境変数で渡します。今日の「鍵はパスだけを .env に書く」がそれ。
 * ・unit06: 概念1の境界線を Express の実装として徹底します。
 *   Vite が VITE_ 付き環境変数をブラウザ向けJSに焼き込む罠も実演します。
 * ・unit07: React から自前APIを呼ぶのも、今日と同じ fetch + await response.json()。
 *
 * 次: 演習へ。lesson を見ながらで OK。
 *   ex01_promise_basics  … Promise と async/await(概念2)
 *   ex02_typed_fetch     … fetch と Response を型に落とす(概念3)
 *   ex03_env_config      … .env と process.env(概念4)
 *   ex04_capstone        … 取り込みの一連の流れを1本に(概念1〜4)
 *   テストは cwd を courses/react-bigquery-prisma/ にして:
 *     npx vitest run unit01-stack-and-async/tests
 * ===================================================================== */
