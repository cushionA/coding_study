/* =====================================================================
 * 概念2: schema.prisma を読む・書く(= EF Core のエンティティ定義)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   Prisma の世界では、**schema.prisma というテキストファイルが正本(single source of truth)**です。
 *   ここに書いた model から、DBのテーブル定義(SQL)も、TypeScript の型も、
 *   両方が自動生成されます。つまりこのファイルを読めない/書けないと、
 *   Prisma では何も始まりません。
 *   逆にここさえ書ければ、テーブル作成SQLを手で書くことは二度とありません。
 *   このファイルでは実際に schema.prisma を書いて、Prisma に
 *   「あなたのこの定義は、どんなSQLになるのか」を吐かせて突き合わせます。
 *
 * ■ 解説:
 *
 *   ● schema.prisma の3種類のブロック
 *
 *     generator client {              ← 何を生成するか
 *       provider = "prisma-client"    ← Prisma 7 の新しい生成器(TypeScript を吐く)
 *       output   = "./generated/prisma" ← 生成物の置き場。7 では明示が必須
 *     }
 *
 *     datasource db {                 ← どのDBか
 *       provider = "sqlite"           ← postgresql / mysql / sqlserver / mongodb ...
 *     }                               ← ※ url はここに書かない(後述)
 *
 *     model Book {                    ← テーブル1つ = model 1つ
 *       id    Int    @id @default(autoincrement())
 *       title String
 *     }
 *
 *   ● Prisma 7 の落とし穴(ネットの古い記事と食い違う点)
 *
 *   世の中の記事の9割は datasource の中に
 *       url = env("DATABASE_URL")
 *   と書いています。**Prisma 7 でこれを書くとエラー(P1012)になります。**
 *
 *       The datasource property `url` is no longer supported in schema files.
 *
 *   接続URLは prisma.config.ts という別ファイルに移りました(概念3で詳しく見ます)。
 *   今日は「URLはスキーマに書かない、設定ファイルに書く」とだけ覚えてください。
 *   このズレを知らないと、記事どおりに書いたのに動かない、で1時間溶かします。
 *
 *   ● フィールドの書き方: 名前 → 型 → 修飾子 → 属性
 *
 *       publishedYear Int?  @default(0)
 *       └名前         └型 └null許容  └属性
 *
 *   型と、C# / SQLite との対応:
 *
 *       Prisma      C#              SQLite に落ちると    備考
 *       String      string          TEXT
 *       Int         int             INTEGER
 *       Float       double          REAL
 *       Boolean     bool            BOOLEAN
 *       DateTime    DateTime        DATETIME
 *       Bytes       byte[]          BLOB
 *       (Json/enum/配列は SQLite では使えない。Postgres なら使える)
 *
 *   修飾子は2つだけ:
 *       Type?   … null を許す。C# の int? / string?(NULL 可)。付けないと NOT NULL
 *       Type[]  … 1対多のリレーション側で使う(スカラーの配列は Postgres 限定)
 *
 *   ● 属性(attribute) — @ が1つはフィールド用、@@ が2つはモデル全体用
 *
 *       @id                        主キー。C# の [Key]
 *       @default(autoincrement())  連番。SQLite なら AUTOINCREMENT
 *       @default(uuid())           UUID を Prisma 側で生成して入れる
 *       @default(now())            作成時刻。SQL では DEFAULT CURRENT_TIMESTAMP
 *       @default(true) / @default(0)  リテラル既定値
 *       @updatedAt                 更新のたびに Prisma が現在時刻を書き込む(DB既定値ではない)
 *       @unique                    その列に一意インデックスを張る
 *       @map("book_title")         DB上の列名だけ変える(コード側は title のまま)
 *
 *       @@index([author])          検索を速くするための索引(一意ではない)
 *       @@unique([title, author])  複数列の組み合わせで一意
 *       @@map("books")             テーブル名だけ変える
 *
 *   EF Core で言えば @id は [Key]、@unique は HasIndex().IsUnique()、
 *   @@index は HasIndex()、@map は ToTable()/HasColumnName() に対応します。
 *   「属性で書ける Fluent API」だと思うとしっくりきます。
 *
 *   ● 索引(@@index)をどこに張るか、の考え方
 *   索引は「WHERE や ORDER BY で使う列」に張ります。一覧画面を著者で絞るなら
 *   @@index([author])。索引は検索を速くする代わりに、書き込みを少し遅くし、容量を食います。
 *   だから「全部の列に張る」は間違いで、**画面の要件から逆算して張る**のが正解です。
 *
 *   ● このファイルで使う新しいAPI(TypeScript 側)
 *     ・node:fs の mkdtempSync / writeFileSync / rmSync
 *          … 一時ディレクトリを作る・ファイルを書く・まとめて消す。
 *            コースのリポジトリを汚さないよう、実験は毎回 OS の一時領域でやります。
 *     ・node:child_process の execFileSync(cmd, args, opts)
 *          … 外部コマンドを同期実行して標準出力を文字列で受け取る。
 *            C# の Process.Start + WaitForExit + StandardOutput.ReadToEnd に相当。
 *            ここでは Prisma CLI(あなたが手で打つなら `npx prisma ...`)を呼びます。
 *     ・prisma migrate diff --from-empty --to-schema <file> --script
 *          … Prisma CLI のサブコマンド。「空のDB」から「このスキーマ」までの差分を
 *            SQL として**標準出力に出すだけ**(DBには一切触らない)。
 *            スキーマとSQLの対応を目で確かめるのに最適な道具です。
 * ===================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

// --- 実験場の準備(ここは道具立て。読み飛ばして STEP 1 へ進んでも構いません) ----
// このファイルは OS の一時ディレクトリに schema.prisma を書いて Prisma CLI を呼びます。
// courses/ 配下に .db や生成物を残さないためです。
const courseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson02-"));
// 一時ディレクトリからも Prisma やアダプタを import できるように、
// コースの node_modules へのリンクだけ張っておく(Windows では junction)。
fs.symlinkSync(
  path.join(courseRoot, "node_modules"),
  path.join(lab, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);

// Prisma CLI(= あなたが打つ `npx prisma ...`)を呼ぶ。失敗したら stdout/stderr を文字列で返す。
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

// --- 見る(worked example) ---------------------------------------------
// GOAL: schema.prisma に書いた model が、どんな CREATE TABLE / CREATE INDEX になるかを
//       1対1で目で確かめる。「? を付ける」「@unique を付ける」がSQLの何に化けるのか。

// STEP 1: 接続設定ファイル(prisma.config.ts)。中身の説明は概念3で行います。
//   今は「URLはスキーマではなくここに書く」とだけ押さえてください。
fs.writeFileSync(path.join(lab, "prisma.config.ts"), `
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  datasource: { url: \`file:\${path.join(__dirname, "app.db")}\` },
});
`);

// STEP 2: いちばん小さい schema.prisma を書いて、文法チェックを通す
const minimalSchema = `
generator client {
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
`;
fs.writeFileSync(path.join(lab, "schema.prisma"), minimalSchema);
const validated = runPrisma(["validate", "--schema", "schema.prisma", "--config", "prisma.config.ts"]);
console.log("STEP 2: prisma validate →", validated.out.trim().split("\n").slice(-1)[0]);

// STEP 3: 【重要】古い記事のとおりに datasource へ url を書くとどうなるか、実際に見る
const oldStyleSchema = minimalSchema.replace(
  `provider = "sqlite"`,
  `provider = "sqlite"\n  url      = env("DATABASE_URL")`,
);
fs.writeFileSync(path.join(lab, "old_style.prisma"), oldStyleSchema);
const oldResult = runPrisma(["validate", "--schema", "old_style.prisma", "--config", "prisma.config.ts"]);
console.log("STEP 3: 古い書き方(datasource に url)は通る? →", oldResult.ok);
const p1012 = oldResult.out.split("\n").find((l) => l.includes("no longer supported"));
console.log("STEP 3: Prisma の言い分 →", (p1012 ?? oldResult.out).replace(/\[[0-9;]*m/g, "").trim());

// STEP 4: 実務で書くくらいの厚みのある model を書いて、SQL に翻訳させる
const richSchema = `
generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Book {
  id            Int      @id @default(autoincrement())  // 主キー・連番
  externalId    String   @unique                        // 外部APIのID。重複させない
  title         String                                  // NOT NULL(? が無いので必須)
  author        String
  publishedYear Int?                                    // ? = null を許す
  price         Float
  inStock       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([author])              // 著者で絞る一覧のための索引(一意ではない)
  @@unique([title, author])      // 同じ著者の同じタイトルは1件だけ
}
`;
fs.writeFileSync(path.join(lab, "rich.prisma"), richSchema);
const diff = runPrisma([
  "migrate", "diff",
  "--config", "prisma.config.ts",
  "--from-empty", "--to-schema", "rich.prisma",
  "--script",
]);
const richSql = diff.out.replace(/^Loaded Prisma config.*\n?/m, "").trim();
console.log("STEP 4: Prisma が生成した SQL ↓↓↓");
console.log(richSql.split("\n").map((l) => "    " + l).join("\n"));

// STEP 5: 対応関係を機械的に取り出して確認する
//   (この summarizeTable は SQL を読むための小道具。Prisma の機能ではありません)
type TableSummary = { columns: string[]; nullable: string[]; indexes: string[] };
function summarizeTable(sql: string, table: string): TableSummary | null {
  const body = new RegExp(`CREATE TABLE "${table}" \\(([^;]*)\\);`).exec(sql);
  if (body === null) return null;
  const columns: string[] = [];
  const nullable: string[] = [];
  for (const raw of body[1].split("\n")) {
    const line = raw.trim().replace(/,$/, "");
    const col = /^"(\w+)"\s+\w+/.exec(line);
    if (col === null) continue;
    columns.push(col[1]);
    if (!/NOT NULL/.test(line)) nullable.push(col[1]); // NOT NULL が無い = null を許す列
  }
  const indexes: string[] = [];
  const re = /CREATE (?:UNIQUE )?INDEX "([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m[1].startsWith(`${table}_`)) indexes.push(m[1]);
  }
  return { columns, nullable, indexes };
}
console.log("STEP 5: Book テーブルの要約 =", JSON.stringify(summarizeTable(richSql, "Book")));
console.log("        → ? を付けた publishedYear だけが nullable。");
console.log("        → @unique は Book_externalId_key、@@index は Book_author_idx、");
console.log("          @@unique([title, author]) は Book_title_author_key という名前で作られる。");
console.log("        → @updatedAt は DB既定値を持たない(Prisma が書き込み時に値を入れるため)。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) publishedYear から ? を外して `publishedYear Int @default(0)` にすると、
//       生成されるSQLの該当行はどう変わる? nullable の一覧はどうなる?
//   (2) @@index([author]) を @@index([author, publishedYear]) に変えると、
//       インデックス名(Book_author_idx)はどうなる?
//   (3) @@unique([title, author]) を消したら、インデックスは何本になる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const changedSchema = richSchema
  .replace("publishedYear Int?", "publishedYear Int ")
  .replace("@@index([author])", "@@index([author, publishedYear])")
  .replace("@@unique([title, author])      // 同じ著者の同じタイトルは1件だけ", "");
fs.writeFileSync(path.join(lab, "changed.prisma"), changedSchema);
const diff2 = runPrisma([
  "migrate", "diff",
  "--config", "prisma.config.ts",
  "--from-empty", "--to-schema", "changed.prisma",
  "--script",
]);
const changedSql = diff2.out.replace(/^Loaded Prisma config.*\n?/m, "").trim();
console.log("変えてみる: 生成された SQL ↓↓↓");
console.log(changedSql.split("\n").map((l) => "    " + l).join("\n"));
console.log("変えてみる: 要約 =", JSON.stringify(summarizeTable(changedSql, "Book")));

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の tagModel(文字列)に、次の要件を満たす model Tag を書いてください。
//       ・id    … 主キー。整数の自動連番
//       ・label … 文字列。必須。**同じ label が2件あってはいけない**
//       ・note  … 文字列。未設定を許す(null 可)
//       書いたら実行すると、Prisma が SQL に翻訳して要約を出してくれます。
// ヒント(概念レベル): 上の Book の書き方をそのまま真似れば書けます。
//   「必須/任意」は ? の有無、「重複禁止」はフィールド属性1つ、
//   「自動連番の主キー」は属性2つの組み合わせです。バッククォート内なので改行はそのまま書けます。
const tagModel = `
`;
// ↑ ここに書く(model Tag { ... } を丸ごと書く)

const composed = minimalSchema + "\n" + tagModel;
fs.writeFileSync(path.join(lab, "answer.prisma"), composed);
const answerDiff = runPrisma([
  "migrate", "diff",
  "--config", "prisma.config.ts",
  "--from-empty", "--to-schema", "answer.prisma",
  "--script",
]);
let result2: TableSummary | null = null;
if (answerDiff.ok) {
  const sql = answerDiff.out.replace(/^Loaded Prisma config.*\n?/m, "").trim();
  console.log("書いてみる: 生成された SQL ↓↓↓");
  console.log(sql.split("\n").map((l) => "    " + l).join("\n"));
  result2 = summarizeTable(sql, "Tag");
} else {
  console.log("書いてみる: Prisma がスキーマを受け付けませんでした ↓↓↓");
  console.log(answerDiff.out.replace(/\[[0-9;]*m/g, "").trim().split("\n").slice(0, 12)
    .map((l) => "    " + l).join("\n"));
}

// 後片付け: 一時ディレクトリごと消す(node_modules はリンクなので本体は消えません)
fs.rmSync(lab, { recursive: true, force: true });

check("概念2: model Tag を書く", result2,
  { columns: ["id", "label", "note"], nullable: ["note"], indexes: ["Tag_label_key"] },
  "実際が null なら、tagModel が空か、Tag テーブルが作られていない(上のエラー出力を読む)。" +
  "columns の順番はスキーマに書いた順です。" +
  "nullable が [] なら note に ? が付いていない。nullable に label が入ったら label に ? を付けてしまっている。" +
  "indexes が [] なら label の @unique が抜けている(名前は Prisma が Tag_label_key と自動命名します)");

export {};
