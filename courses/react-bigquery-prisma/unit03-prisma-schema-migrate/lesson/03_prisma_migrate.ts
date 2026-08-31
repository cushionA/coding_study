/* =====================================================================
 * 概念3: マイグレーション(= EF Core の Code First Migrations)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   schema.prisma を書き換えただけでは、DBは1ミリも変わりません。
 *   「宣言(schema.prisma)」と「実物(DB)」の差を埋める作業がマイグレーションです。
 *   実務でここが雑だと、
 *     ・自分のPCでは動くのに、同僚のPCやステージングではテーブルが無い
 *     ・本番に手でSQLを打った結果、誰も本当のスキーマを説明できない
 *   という、あとから取り返しのつかない事故になります。
 *   Prisma は「差分SQLをファイルとして生成し、それを順番に適用した記録をDBに残す」
 *   という方式でこれを解きます。C# の EF Core をやったことがあれば、
 *   まったく同じ思想だと分かるはずです。
 *
 * ■ 解説:
 *
 *   ● EF Core との対応
 *
 *       Prisma                            EF Core (C#)
 *       schema.prisma を編集               エンティティクラスを編集
 *       npx prisma migrate dev --name X   dotnet ef migrations add X
 *                                          + dotnet ef database update(2つを一気にやる)
 *       migrations/<時刻>_X/migration.sql  Migrations/<時刻>_X.cs
 *       _prisma_migrations テーブル        __EFMigrationsHistory テーブル
 *       npx prisma migrate deploy         dotnet ef database update(本番/CI用)
 *       npx prisma migrate reset          DBを捨てて作り直し(開発専用)
 *
 *   ● 3つのコマンドの使い分け(ここを間違えると本番事故)
 *
 *     migrate dev     開発機でだけ使う。スキーマとDBを比べて差分SQLを新規作成し、適用する。
 *                     必要なら「作り直しますか?」と聞いてくる(データが消える可能性がある)。
 *     migrate deploy  本番/CI で使う。**新しいSQLを作らない**。
 *                     migrations/ にある未適用のものを順番に流すだけ。冪等(何度打っても安全)。
 *     migrate reset   DBを空にして全マイグレーションを流し直す。開発機専用。
 *
 *   ● migrations/ ディレクトリが「履歴そのもの」
 *
 *       migrations/
 *         migration_lock.toml              ← どのDB向けの履歴かを記録(git にコミットする)
 *         20260831094904_init/
 *           migration.sql                  ← 生成されたSQL。**人間が読めるしレビューできる**
 *         20260831094906_add_published_year/
 *           migration.sql
 *
 *   このディレクトリは **必ず git にコミット**します。ソースコードと同じ扱いです。
 *   逆に *.db(SQLite の実ファイル)は .gitignore に入れます。
 *   「コードとマイグレーションはコミット、データはコミットしない」が原則。
 *
 *   ● 適用済みの記録は DB 側にある
 *
 *   マイグレーションを流すと、DBの中に _prisma_migrations という管理テーブルが作られ、
 *   「どのマイグレーションを、いつ、成功で適用したか」が記録されます。
 *   deploy はこの記録と migrations/ を突き合わせて、未適用のものだけを流します。
 *   だから何度打っても二重に流れません。
 *
 *   ● prisma.config.ts(Prisma 7 で必須になった設定ファイル)
 *
 *   概念2で見たとおり、接続URLは schema.prisma には書けません。CLI 用の接続情報は
 *   このファイルに置きます。中身は実質2つ:
 *
 *       schema         … スキーマファイルの場所
 *       datasource.url … CLI(migrate / migrate diff など)が接続するURL
 *       (任意) migrations.path … migrations/ の置き場所を変えたいとき
 *       (任意) migrations.seed … 初期データ投入コマンド
 *
 *   ★ ここも古い記事とズレるポイントです。Prisma 6 系の記事には
 *
 *       migrate: { adapter: async () => new PrismaBetterSqlite3({ ... }) }
 *
 *   と書いてあることがありますが、**7.10 の PrismaConfig 型に migrate というキーは
 *   存在しません**(書くとエディタが型エラーを出し、実行時は黙って無視されます)。
 *   CLI は datasource.url を見て直接つなぎます。
 *   ドライバアダプタが必要になるのは **アプリ実行時の PrismaClient を作るときだけ**で、
 *   それは概念4でやります。「CLI 用の設定」と「アプリ用の接続」は別物、と覚えてください。
 *
 *   ● 破壊的変更のときに何が起きるか
 *
 *   列を消す・必須にする・型を変える、はデータが消えたり入らなくなる可能性があります。
 *   migrate dev はそれを検知して警告し、場合によっては確認を求めます。
 *   さらに SQLite は ALTER TABLE が弱いので、Prisma は
 *   「新テーブルを作る → データをコピー → 旧テーブルを消す → 名前を変える」という
 *   RedefineTables 方式のSQLを生成します(下の「変えてみる」で実物を見ます)。
 *
 *   ● このファイルで使う新しいAPI
 *     ・prisma migrate dev --name <名前>  … 差分SQLを生成して適用する(開発機用)
 *     ・prisma migrate deploy            … 未適用のSQLを流すだけ(本番用)
 *     ・better-sqlite3 の new Database(path) / db.prepare(sql).all()
 *          … SQLite ファイルを直接開いて素のSQLを実行するライブラリ。
 *            C# の SqliteConnection + SqliteCommand に相当。
 *            ここでは「Prisma が裏で何をしたか」を覗くための懐中電灯として使います。
 *            アプリのコードから使うのは Prisma であって、これではありません。
 * ===================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

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
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson03-"));
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
// Prisma CLI の出力から、意味のある行だけを拾って表示する
function showPrisma(label: string, r: { ok: boolean; out: string }): void {
  const lines = r.out.replace(/\[[0-9;]*m/g, "").split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "" && !l.startsWith("Loaded Prisma config") && !l.startsWith("Prisma schema loaded"));
  console.log(`${label} (成功=${r.ok})`);
  for (const l of lines) console.log("    " + l);
}
// migrations/ の中を一覧する小道具
function listMigrations(): string[] {
  const dir = path.join(lab, "migrations");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isDirectory()).sort();
}
function readMigrationSql(name: string): string {
  return fs.readFileSync(path.join(lab, "migrations", name, "migration.sql"), "utf8").trim();
}
function indent(s: string): string {
  return s.split("\n").map((l) => "    " + l).join("\n");
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「schema.prisma を書き換える → migrate dev → SQLが生まれてDBが変わる」の一往復を、
//       生成物(migration.sql)と適用記録(_prisma_migrations)まで含めて全部見る

// STEP 1: プロジェクトの足場。この2ファイルが Prisma 7 の最小構成。
const BASE_SCHEMA = `generator client {
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
`;
// ↑ 末尾の } はこの後で足します(フィールドを追記していくため)
fs.writeFileSync(path.join(lab, "schema.prisma"), BASE_SCHEMA + "}\n");

const CONFIG = `import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  datasource: {
    // CLI(migrate / migrate diff)が接続するURL。__dirname はこのファイルのある場所。
    url: \`file:\${path.join(__dirname, "app.db")}\`,
  },
});
`;
fs.writeFileSync(path.join(lab, "prisma.config.ts"), CONFIG);
console.log("STEP 1: prisma.config.ts の中身 ↓↓↓");
console.log(indent(CONFIG));
console.log("STEP 1: 実験場 =", lab);

// STEP 2: 最初のマイグレーション。手で打つなら `npx prisma migrate dev --name init`
showPrisma("STEP 2: migrate dev --name init", runPrisma(["migrate", "dev", "--name", "init"]));
console.log("STEP 2: migrations/ の中身 =", JSON.stringify(fs.readdirSync(path.join(lab, "migrations"))));

// STEP 3: 生成された SQL は人間が読める。レビュー対象であり、git にコミットするもの。
const first = listMigrations()[0];
console.log(`STEP 3: ${first}/migration.sql ↓↓↓`);
console.log(indent(readMigrationSql(first)));

// STEP 4: DB側に残る「適用記録」を覗く(better-sqlite3 で直接開く)
const dbPath = path.join(lab, "app.db");
let db = new Database(dbPath);
console.log("STEP 4: DB内のテーブル一覧 =", JSON.stringify(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
    .map((r) => (r as { name: string }).name),
));
console.log("STEP 4: _prisma_migrations の中身 =", JSON.stringify(
  db.prepare("SELECT migration_name, applied_steps_count FROM _prisma_migrations").all(),
));
console.log("        ↑ EF Core の __EFMigrationsHistory と同じ役割。deploy はこれを見て未適用だけ流す。");

// STEP 5: スキーマにフィールドを1つ足して、もう一度 migrate dev
fs.writeFileSync(path.join(lab, "schema.prisma"), BASE_SCHEMA + "  publishedYear Int?\n}\n");
showPrisma("STEP 5: migrate dev --name add_published_year",
  runPrisma(["migrate", "dev", "--name", "add_published_year"]));
const second = listMigrations()[1];
console.log(`STEP 5: ${second}/migration.sql ↓↓↓`);
console.log(indent(readMigrationSql(second)));
console.log("        ↑ 2回目は CREATE TABLE ではなく差分(ALTER TABLE)だけが生成される。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) いまDBには本が1件も入っていません。ここで1件 INSERT してから
//       `publisher String @default("不明")`(必須・既定値あり)を追加して migrate dev すると、
//       生成されるSQLは ALTER TABLE 1行で済むでしょうか?
//       (ヒント: SQLite の ALTER TABLE はとても機能が限られています)
//   (2) そのとき、既に入っていた1件のデータはどうなる? publisher の値は何になる?
//   (3) `npx prisma migrate deploy` を、未適用のマイグレーションが無い状態で打つと何が起きる?
//       同じSQLがもう一度流れてデータが壊れる? それとも何もしない?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1)(2): 先にデータを1件入れておく → 必須フィールドを追加 → 生成SQLと残ったデータを見る
db.prepare(`INSERT INTO "Book" (title, author) VALUES (?, ?)`).run("吾輩は猫である", "夏目漱石");
console.log("変えてみる: 追加前のデータ =", JSON.stringify(db.prepare(`SELECT * FROM "Book"`).all()));
db.close(); // Prisma に触らせる前に閉じておく

fs.writeFileSync(
  path.join(lab, "schema.prisma"),
  BASE_SCHEMA + `  publishedYear Int?\n  publisher     String @default("不明")\n}\n`,
);
showPrisma("変えてみる: migrate dev --name add_publisher",
  runPrisma(["migrate", "dev", "--name", "add_publisher"]));
const third = listMigrations()[2];
console.log(`変えてみる: ${third}/migration.sql ↓↓↓`);
console.log(indent(readMigrationSql(third)));

db = new Database(dbPath);
console.log("変えてみる: 追加後のデータ =", JSON.stringify(db.prepare(`SELECT * FROM "Book"`).all()));
db.close();
console.log("        ↑ 新テーブルを作って INSERT ... SELECT でコピーし、旧テーブルを捨てて名前を付け替える。");
console.log("          既定値のおかげで既存行にも値が入る。既定値なしで必須列を足すと、既存行の値が決まらず失敗する。");

// (3): 未適用が無い状態での deploy(本番で使うコマンド)
showPrisma("変えてみる: migrate deploy", runPrisma(["migrate", "deploy"]));

// --- 書いてみる ---------------------------------------------------------
// 課題: Book に「ISBN」を持たせ、ISBN で絞り込む画面も作ることになりました。
//       下の newField に、model Book の中に追記する内容(複数行可)を書いてください。
//       ・フィールド名は isbn、文字列
//       ・まだ分からない本もあるので未設定を許す
//       ・ISBN で検索するので、検索用の索引を張る(一意ではない索引)
//       実行するとこのスクリプトが migrate dev --name add_isbn を代わりに打ちます。
// ヒント(概念レベル): 概念2で見た「? による null 許容」と、モデル全体にかかる索引の属性(@@)。
//   索引の行はフィールドの下に1行空けて書くのが慣習です。
// ※ ここで @unique を使わないのには理由があります。一意制約の追加は
//   「既存データが重複していたら失敗する」ため、Prisma は本当に進めてよいか確認を求めます。
//   このスクリプトは対話できない環境で動いているので、確認待ちになるとエラーで止まります
//   (手で `npx prisma migrate dev` を打つときは y/n を聞かれるだけです)。
const newField = ``;
// ↑ ここに書く(model の中身として正しい形で。先頭の半角2スペースも忘れずに)

fs.writeFileSync(
  path.join(lab, "schema.prisma"),
  BASE_SCHEMA + `  publishedYear Int?\n  publisher     String @default("不明")\n` + newField + "\n}\n",
);
showPrisma("書いてみる: migrate dev --name add_isbn",
  runPrisma(["migrate", "dev", "--name", "add_isbn"]));

let result3: { migrations: string[]; bookColumns: string[]; indexes: string[] } | null = null;
try {
  const applied = listMigrations().map((n) => n.replace(/^\d+_/, "")); // 先頭のタイムスタンプを外す
  db = new Database(dbPath);
  const bookColumns = db.prepare(`SELECT name FROM pragma_table_info('Book')`).all()
    .map((r) => (r as { name: string }).name);
  const indexes = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Book' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  ).all().map((r) => (r as { name: string }).name);
  db.close();
  result3 = { migrations: applied, bookColumns, indexes };
  console.log("書いてみる: 現在の状態 =", JSON.stringify(result3));
} catch (err) {
  console.log("書いてみる: DBを読めませんでした →", (err as Error).message);
}

// 後片付け: 一時ディレクトリごと消す(node_modules はリンクなので本体は消えません)
fs.rmSync(lab, { recursive: true, force: true });

check("概念3: フィールド追加をマイグレーションで反映する", result3,
  {
    migrations: ["init", "add_published_year", "add_publisher", "add_isbn"],
    bookColumns: ["id", "title", "author", "publishedYear", "publisher", "isbn"],
    indexes: ["Book_isbn_idx"],
  },
  "migrations に add_isbn が無い → newField が空のまま(Prisma は『変更なし』と判断して何も作らない)。" +
  "bookColumns に isbn が無いのも同じ原因。" +
  "indexes が [] → 索引の指定が抜けている(@@index([isbn]) を書けば Prisma が Book_isbn_idx を作る)。" +
  "indexes が [\"Book_isbn_key\"] になった人は @unique を使っている(名前の末尾 _key は一意索引の印)。" +
  "上の migrate dev の出力が 成功=false なら、書いた内容の文法エラー(型名は大文字始まり、" +
  "インデントは半角2スペース、model の中に収まる形であること)");

export {};
