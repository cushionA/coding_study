/* =====================================================================
 * 概念4: Prisma Client を生成して使う(= DbContext を組み立てる)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここまでで「schema.prisma を書く」「DBに反映する」ができました。
 *   最後のピースが、アプリのコードからDBを叩くための入口 —— PrismaClient です。
 *   Prisma の一番おいしいところは、**スキーマから TypeScript の型が生成される**こと。
 *   prisma.book.create({ data: { titl: "..." } }) と打ち間違えた瞬間に
 *   エディタが赤線を出します(C# のコンパイルエラーと同じ体験が、DBアクセスにも来ます)。
 *   さらに Prisma 7 は接続の作り方が変わっており(ドライバアダプタ)、
 *   ここを知らないと import すら通りません。unit04 以降のすべての回で使う足場です。
 *
 * ■ 解説:
 *
 *   ● npx prisma generate が何をするか
 *
 *   schema.prisma を読んで、generator の output に指定した場所に
 *   TypeScript のコードを吐き出します。生成されるのは主に3つ:
 *
 *       PrismaClient クラス   … DBへの入口。C# の DbContext
 *       モデルの型            … Book など、1行を表す型
 *       入力の型              … BookCreateInput / BookWhereInput / BookWhereUniqueInput …
 *                              「create に渡してよい形」「where に書いてよい形」が型になっている
 *
 *   生成物は **git にコミットしません**(.gitignore に入れる)。
 *   npm install のあとに generate を回す、というのがチーム開発の定番です。
 *   EF Core で言えば「scaffold されたコードを毎回作り直す」感覚に近い。
 *
 *   ● import のときの落とし穴(ESM)
 *
 *       import { PrismaClient } from "./generated/prisma/client.js";
 *                                                          ^^^ .ts ではなく .js
 *
 *   このコースは ESM(package.json の "type": "module")なので、
 *   TypeScript のファイルを指す import でも拡張子は .js と書きます。
 *   これは Prisma に限らず ESM 全体の作法です(C# の using には無い癖なので戸惑いますが、
 *   「実行時に存在するファイル名を書く」と考えると納得できます)。
 *
 *   ● ドライバアダプタ(Prisma 7 の新方式)
 *
 *       import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
 *       const adapter = new PrismaBetterSqlite3({ url: "file:./app.db" });
 *       const prisma  = new PrismaClient({ adapter });
 *
 *   Prisma 7 では SQL 系DBへの接続に**ドライバアダプタ**という薄い層を挟みます。
 *   従来 Prisma に同梱されていた Rust 製のクエリエンジンをやめ、
 *   JavaScript の DB ドライバ(better-sqlite3 / pg など)をそのまま使う方式に
 *   変わったためです。3つ注意点があります:
 *     (1) クラス名は PrismaBetterSqlite3。**"Sqlite3" であって "SQLite" ではない**
 *         (大文字小文字を間違えると import できずに詰まります)。
 *     (2) 渡すのは better-sqlite3 の Database インスタンスではなく **{ url } オブジェクト**。
 *     (3) アダプタが要るのは**アプリ実行時のここだけ**。概念3で書いた prisma.config.ts には
 *         書きません(7.10 の PrismaConfig 型に adapter/migrate というキーは無く、
 *         CLI は datasource.url で直接つなぎます)。
 *         「CLI 用の設定」と「アプリ用の接続」は別物、と切り分けて覚えてください。
 *   Postgres なら @prisma/adapter-pg の PrismaPg に差し替えるだけで、以降のコードは同じです。
 *
 *   ● PrismaClient はシングルトンで使う
 *
 *   PrismaClient は内部にDBへの接続(コネクションプール)を抱えます。
 *   HTTPリクエストのたびに new すると、接続が増え続けてすぐに枯渇し、
 *   本番で "too many connections" に殴られます。
 *   **アプリ全体で1つだけ作って使い回す**のが正解です。
 *
 *       C# との対比:
 *         EF Core の DbContext は「リクエストごとに作って捨てる」短命オブジェクトで、
 *         接続プールは DbContext の外(ADO.NET 側)にありました。
 *         Prisma の PrismaClient は **DbContext + 接続プールを兼ねた長命オブジェクト**です。
 *         だから寿命の考え方が逆になります。ここは意識して切り替えてください。
 *
 *   実務での定番はこの形(unit06 で実際にこのファイルを作ります):
 *
 *       // src/db.ts
 *       const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
 *       export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
 *       if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
 *
 *   globalThis に退避しているのは、開発サーバのホットリロードでモジュールが
 *   何度も読み直されても、クライアントが増殖しないようにするためです。
 *   $disconnect() はプロセス終了時に1回呼べば十分です(毎回呼ぶものではない)。
 *
 *   ● このファイルで使う新しいAPI
 *     ・prisma generate            … スキーマから TypeScript を生成する
 *     ・new PrismaClient({ adapter }) … DBへの入口を作る
 *     ・prisma.book.create({ data }) / findMany({ where }) … unit04 の主役。今日は味見だけ
 *     ・prisma.$disconnect()       … 接続を閉じる。プロセスの終わりに1回
 *     ・await import(url)          … 実行時にモジュールを読み込む書き方(動的 import)。
 *          今回は「実行中に生成したクライアント」を読むので動的 import を使いますが、
 *          あなたのプロジェクトでは普通の import を書きます(そちらなら型も全部効きます)。
 * ===================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

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

// --- 実験場の準備(道具立て) --------------------------------------------
const courseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson04-"));
fs.symlinkSync(
  path.join(courseRoot, "node_modules"),
  path.join(lab, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);
const prismaBin = path.join(courseRoot, "node_modules", "prisma", "build", "index.js");
function runPrisma(args: string[]): { ok: boolean; out: string } {
  try {
    const out = execFileSync(process.execPath, [prismaBin, ...args], {
      cwd: lab, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` || String(e.message) };
  }
}
function lastLine(s: string): string {
  const lines = s.replace(/\[[0-9;]*m/g, "").split("\n").map((l) => l.trim()).filter((l) => l !== "");
  return lines[lines.length - 1] ?? "";
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: schema → generate → PrismaClient を作る → 実際に1件書いて読む、を通しでやる。
//       ついでに「生成された型」を自分の目で読む。

// STEP 1: 足場(概念3と同じ2ファイル)
fs.writeFileSync(path.join(lab, "schema.prisma"), `generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Book {
  id     Int    @id @default(autoincrement())
  title  String
  author String
}
`);
fs.writeFileSync(path.join(lab, "prisma.config.ts"), `import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  datasource: { url: \`file:\${path.join(__dirname, "app.db")}\` },
});
`);

// STEP 2: テーブルを作る(概念3の復習)
console.log("STEP 2: migrate dev →", lastLine(runPrisma(["migrate", "dev", "--name", "init"]).out));

// STEP 3: クライアントを生成する
const generated = runPrisma(["generate"]);
console.log("STEP 3: prisma generate →", lastLine(generated.out));
console.log("STEP 3: 生成物 =", JSON.stringify(fs.readdirSync(path.join(lab, "generated", "prisma"))));

// STEP 4: 生成された「入力の型」を読む。ここが Prisma の心臓部。
function excerptType(src: string, typeName: string): string {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`export type ${typeName} = `));
  if (start === -1) return `(${typeName} が見つかりません)`;
  const end = lines.findIndex((l, i) => i > start && l.startsWith("}"));
  return lines.slice(start, end + 1).join("\n");
}
const modelSrc = fs.readFileSync(path.join(lab, "generated", "prisma", "models", "Book.ts"), "utf8");
console.log("STEP 4: 生成された BookCreateInput ↓↓↓");
console.log(excerptType(modelSrc, "BookCreateInput").split("\n").map((l) => "    " + l).join("\n"));
console.log("        ↑ id が無い。@default(autoincrement()) なので、こちらが渡すものではないから。");
console.log("STEP 4: 生成された BookWhereInput ↓↓↓");
console.log(excerptType(modelSrc, "BookWhereInput").split("\n").map((l) => "    " + l).join("\n"));
console.log("        ↑ where に書ける形も型で決まっている。unit04 で contains などを使い倒します。");

// STEP 5: PrismaClient を作って、実際に書いて読む
//   このレッスンでは「実行中に生成したクライアント」を読むので動的 import を使います。
//   あなたのプロジェクトでは静的に import { PrismaClient } from "./generated/prisma/client.js";
//   と書いてください(そちらなら生成された型がそのまま効きます)。
const clientModule = await import(
  pathToFileURL(path.join(lab, "generated", "prisma", "client.js")).href
);

// 動的 import の戻り値は型が付かないので、ここで「使う分だけ」の形を宣言しておく。
// (本物の生成された型は STEP 4 で見たとおり、もっと精密です)
type Book = { id: number; title: string; author: string };
type LessonPrismaClient = {
  book: {
    create(args: { data: { title: string; author: string } }): Promise<Book>;
    findMany(args?: { where?: { author?: string }; orderBy?: { id?: "asc" | "desc" } }): Promise<Book[]>;
    count(): Promise<number>;
  };
  $disconnect(): Promise<void>;
};
const PrismaClient = clientModule.PrismaClient as new (opts: { adapter: unknown }) => LessonPrismaClient;

const dbUrl = `file:${path.join(lab, "app.db")}`;
const openClients: LessonPrismaClient[] = [];
let clientsCreated = 0; // 「何個 PrismaClient を作ったか」を数える(シングルトンの確認用)
function newPrismaClient(): LessonPrismaClient {
  clientsCreated++;
  // ★ ここが Prisma 7 の作法: アダプタを作って PrismaClient に渡す
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const client = new PrismaClient({ adapter });
  openClients.push(client);
  return client;
}

const prisma = newPrismaClient();
const created = await prisma.book.create({ data: { title: "吾輩は猫である", author: "夏目漱石" } });
console.log("STEP 5: create の戻り値 =", JSON.stringify(created), "← id は DB が採番して返ってくる");
await prisma.book.create({ data: { title: "こころ", author: "夏目漱石" } });
await prisma.book.create({ data: { title: "銀河鉄道の夜", author: "宮沢賢治" } });
console.log("STEP 5: findMany =", JSON.stringify(await prisma.book.findMany()));
console.log("STEP 5: where で絞る =", JSON.stringify(
  await prisma.book.findMany({ where: { author: "宮沢賢治" } }),
));
console.log("STEP 5: ここまでに作った PrismaClient の数 =", clientsCreated);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) PrismaClient を3個作って、それぞれで count() を呼んだら、
//       3つとも同じ件数が返る? それとも別々の値になる?
//       (同じDBファイルを指しています)
//   (2) 「3個作る」のと「1個を使い回す」のとでは、何が違うのでしょう。
//       結果が変わる? 速度が変わる? それとも別の何かが増える?
//   (3) STEP 4 で見た BookCreateInput に author を書かずに create したら、
//       どの段階(実行前?実行時?)で怒られる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const t0 = Date.now();
const counts: number[] = [];
for (let i = 0; i < 3; i++) {
  const p = newPrismaClient(); // 毎回まっさらなクライアント(= 毎回つなぎ直し)
  counts.push(await p.book.count());
}
console.log(`変えてみる (1): 毎回 new した3回 → ${JSON.stringify(counts)} / ${Date.now() - t0}ms`
  + ` / これまでに作った数=${clientsCreated}`);

const t1 = Date.now();
const shared = newPrismaClient();
const counts2 = [await shared.book.count(), await shared.book.count(), await shared.book.count()];
console.log(`変えてみる (2): 1個を使い回した3回 → ${JSON.stringify(counts2)} / ${Date.now() - t1}ms`
  + ` / これまでに作った数=${clientsCreated}`);
console.log("        ↑ 結果は同じ。違うのは『接続が何本開くか』。");
console.log("          SQLite だから平気なだけで、Postgres で毎リクエスト new すると接続が枯れます。");

// --- 書いてみる ---------------------------------------------------------
// 課題: 何度呼ばれても **同じ1個の PrismaClient を返す** getPrisma() を完成させてください。
//       ・1回目の呼び出しでだけ newPrismaClient() を呼ぶ
//       ・2回目以降は、1回目に作ったものをそのまま返す
//       (実務ではこれを src/db.ts に置いて、アプリ全体で import します)
// ヒント(概念レベル): 外側の変数に「作ったものを覚えておく」。
//   まだ無いときだけ作る、という分岐は ??= や if (x === null) で書けます(C# の ??= と同じ)。
let cached: LessonPrismaClient | null = null;
function getPrisma(): LessonPrismaClient | null {
  // ここに書く(cached がまだ無いときだけ newPrismaClient() で作り、cached に覚えさせる)

  return cached; // ← 最後は必ず cached を返す(この行は消さない)
}

clientsCreated = 0; // ここから数え直す
const c1 = getPrisma();
const c2 = getPrisma();
const c3 = getPrisma();
const result4: { sameInstance: boolean; clientsCreated: number } = {
  sameInstance: c1 !== null && c1 === c2 && c2 === c3,
  clientsCreated,
};
console.log("書いてみる: 判定材料 =", JSON.stringify(result4));

// 後片付け: 開いたクライアントを全部閉じてから、一時ディレクトリごと消す
for (const c of openClients) await c.$disconnect();
fs.rmSync(lab, { recursive: true, force: true });

check("概念4: PrismaClient のシングルトン", result4,
  { sameInstance: true, clientsCreated: 1 },
  "clientsCreated が 0 → getPrisma() が newPrismaClient() を一度も呼んでいない(未記入のまま)。" +
  "clientsCreated が 3 → 毎回 new している(戻り値を cached に代入して覚えていない)。" +
  "sameInstance が false で clientsCreated が 1 → 作ったものを cached に入れていない" +
  "(cached = newPrismaClient() の形にする)");

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
 * 概念               一言で                                          C# で言うと
 * OLTP と OLAP       Prisma+SQLite/Postgres は「1件を速く正確に」の    ---
 *                     世界(行指向・トランザクション・一意制約)。
 *                     BigQuery は「大量を集計する」世界(列指向・
 *                     スキャン量課金・制約なし)。解く問題が違うので
 *                     道具が2つある。Prisma は BigQuery を
 *                     サポートしていないし、する必要もない
 * schema.prisma      generator / datasource / model の3ブロック。      エンティティクラス
 *                     model 1つ = テーブル1つ。? で null 許容、        + Fluent API
 *                     @id/@default/@unique/@@index/@@unique で制約と索引
 * Prisma 7 の作法    datasource に url は書けない(P1012)。            ---
 *                     URLは prisma.config.ts。generator は
 *                     provider="prisma-client" + output 必須
 * migrate            migrate dev = 差分SQL生成+適用(開発機)。         dotnet ef migrations add
 *                     migrate deploy = 未適用を流すだけ(本番・冪等)。  + database update
 *                     migrations/ が履歴そのもの。git にコミットする。   Migrations/ フォルダ
 *                     適用記録は DB の _prisma_migrations               __EFMigrationsHistory
 * generate           スキーマから TypeScript を生成。BookCreateInput /  scaffold されたコード
 *                     BookWhereInput など「渡してよい形」が型になる。
 *                     生成物は .gitignore、install 後に generate
 * PrismaClient       new PrismaClient({ adapter }) が唯一の入口。       DbContext + 接続プール
 *                     アプリ全体で**1個だけ**作って使い回す
 *                     (EF Core の DbContext とは寿命の考え方が逆)
 *
 * この先どこで使うか:
 * ・unit04: 今日 STEP 5 で味見した create / findMany を本格的にやります。
 *   where の contains(部分一致)、orderBy、take/skip(ページング)、count、
 *   そして冪等な取り込みの要である upsert、1対多リレーションと include、
 *   $transaction。今日読んだ BookWhereInput / BookCreateInput の型が、
 *   そのまま「書ける引数」の説明書になります。
 * ・unit06: 今日の「シングルトン」を src/db.ts として実装し、Express の
 *   repository 層から import します。prisma.config.ts と PrismaClient の
 *   アダプタが別物である理由も、そこでもう一度効いてきます。
 * ・unit05: 今日「Prisma の担当ではない」と切り分けた BigQuery を、
 *   @google-cloud/bigquery で直接叩きます。スキーマの考え方(型・NULL可)は
 *   似ていますが、一意制約が無い・スキャン量で課金される、という違いを
 *   今日の対比表と突き合わせながら進めてください。
 * ・unit08: 同じ取り込みデータを Prisma と BigQuery の両方に書きます。
 *   「どちらが正のデータか」を今日の言葉で説明できることが前提になります。
 *
 * 手を動かして確かめたい人へ:
 *   このレッスンは毎回 OS の一時ディレクトリで実験してリポジトリを汚しませんが、
 *   unit03-prisma-schema-migrate/prisma/ に、検証済みの schema.prisma /
 *   prisma.config.ts と、そこから実際に生成された migrations/ と generated/prisma/
 *   が置いてあります。そのディレクトリで
 *     npx prisma generate --config prisma.config.ts
 *     npx prisma migrate dev --name <名前> --config prisma.config.ts
 *   を自分の手で打って、同じ結果になることを確かめてみてください。
 *
 * 次: 演習へ。lesson を見ながらで OK。
 *   ex01_read_schema   … schema.prisma を解析して model/フィールド/属性を読み取る(概念1〜2)
 *   ex02_write_model   … 要件から model ブロックを組み立てる(概念2)
 *   ex03_migrate_flow  … migration.sql を解析してテーブル/カラム/索引/null許容を読み取る(概念3)
 *   ex04_capstone      … 生成済み PrismaClient を組み立てて create→findMany まで(概念4)
 *   テストは cwd を courses/react-bigquery-prisma/ にして:
 *     npx vitest run unit03-prisma-schema-migrate/tests
 * ===================================================================== */
