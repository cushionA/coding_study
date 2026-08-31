/* =====================================================================
 * 概念3: 冪等な取り込み(upsert) と 1対多リレーション(include)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   外部APIやCSVからデータを取り込むバッチ処理は、実務では**何度も
 *   同じデータで再実行される**運命にあります(手動リトライ、cronの
 *   二重起動、デプロイのやり直し……)。同じ本を2回取り込むたびに行が
 *   増えてしまっては困ります。「あれば更新・無ければ作成」を1回で
 *   済ませるupsertは、この冪等性(何回実行しても結果が同じ)を実現する
 *   道具です。
 *   もう1つ、実務のデータはほぼ必ず「1件が複数の関連データを持つ」
 *   構造をしています(1冊の本に複数のタグが付く、など)。これを毎回
 *   別々のクエリで取りに行くのは非効率かつ書き味も悪いので、Prismaの
 *   include で1クエリにまとめる方法を学びます。
 *
 * ■ 解説:
 *
 *   ● upsert = 「あれば更新・無ければ作成」を1回で
 *       prisma.book.upsert({
 *         where:  { isbn: "978-..." },       // どの行かを一意キーで特定
 *         update: { title, author, rating }, // 存在した場合に書き換える内容
 *         create: { isbn, title, author, rating }, // 存在しない場合に作る内容
 *       })
 *   `where` に使うのは `@unique` が付いたフィールド(このユニットでは
 *   `isbn`)。C#でEF Coreを使う場合、自分で
 *       var existing = await db.Books.FirstOrDefaultAsync(b => b.Isbn == isbn);
 *       if (existing != null) { existing.Title = title; ... } else { db.Books.Add(...); }
 *       await db.SaveChangesAsync();
 *   と書く必要がありますが、Prismaはこれを1メソッド・1SQLに圧縮し、
 *   かつDBの一意制約に守られたアトミックな操作にしてくれます。
 *
 *   ● 1対多リレーション(このユニットの Book 1 ― Tag 多)
 *   schema.prisma で Tag 側に `bookId Int` と `book Book @relation(...)`
 *   を書き、Book側に `tags Tag[]` を書くと、「1冊の本が複数のタグを
 *   持つ」関係になります。C#のEF Coreで言えば、Book クラスに
 *   `List<Tag> Tags` というナビゲーションプロパティを持たせるのと同じ。
 *
 *   ● include で関連データを1クエリで取る
 *       prisma.book.findUnique({ where: { id }, include: { tags: true } })
 *   これはEF Coreの `dbContext.Books.Include(b => b.Tags).First(...)` に
 *   相当します。includeを付けないと、戻り値のオブジェクトに `tags`
 *   フィールドは含まれません(型の上でも存在しないので、includeを
 *   忘れて `.tags` にアクセスしようとするとコンパイルエラーになります)。
 *
 *   ● ネストしたcreate(更新と同時に関連行も作る)
 *       prisma.book.update({
 *         where: { id: bookId },
 *         data: { tags: { create: { label: "sci-fi" } } }, // ネスト
 *         include: { tags: true },
 *       })
 *   `data` の中に関連モデル名(`tags`)をキーとして書き、その中に
 *   `create` を書くと、「この本に紐づく新しいTagを1件作る」処理に
 *   なります。ネストしたcreateの中では `bookId` を書く必要はありません
 *   (今まさに更新している本のidを、Prismaが自動で埋めてくれるため)。
 *
 *   ● このファイルで使う新しいAPI
 *     ・prisma.book.upsert({ where, update, create }) … 冪等な作成/更新
 *     ・include: { tags: true }                        … 関連データを1クエリで取得
 *     ・data: { tags: { create: {...} } }               … ネストしたcreate
 * ===================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../prisma/generated/prisma/client.js";

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

// --- 実験場の準備 --------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url));
const CREATE_TABLE_SQL = fs.readFileSync(
  path.join(here, "..", "prisma", "migrations", "20260831105353_init", "migration.sql"),
  "utf8",
);
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson03-"));
const dbFilePath = path.join(lab, "app.db");
const rawDb = new Database(dbFilePath);
rawDb.pragma("foreign_keys = ON");
rawDb.exec(CREATE_TABLE_SQL);
rawDb.close();
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFilePath}` });
const prisma = new PrismaClient({ adapter });

// --- 見る(worked example) ---------------------------------------------
// GOAL: 同じ取り込み処理を2回実行しても重複しないことを目で見る。

// STEP 1: 1回目の取り込み
const first = await prisma.book.upsert({
  where: { isbn: "978-1" },
  update: { title: "旧タイトル", author: "山田" },
  create: { isbn: "978-1", title: "旧タイトル", author: "山田" },
});
console.log("STEP 1: 1回目のupsert =", JSON.stringify(first));

// STEP 2: 「同じ外部データを再取得したら内容が変わっていた」を再現し、2回目を実行
const second = await prisma.book.upsert({
  where: { isbn: "978-1" },
  update: { title: "改訂版タイトル", author: "山田" },
  create: { isbn: "978-1", title: "改訂版タイトル", author: "山田" },
});
console.log("STEP 2: 2回目のupsert(同じisbn) =", JSON.stringify(second));
console.log("STEP 2: idは同じ?", first.id === second.id, " / 総件数 =", await prisma.book.count());

// STEP 3: タグを追加する(ネストしたcreate + include)
const withTag = await prisma.book.update({
  where: { id: first.id },
  data: { tags: { create: { label: "入門書" } } },
  include: { tags: true },
});
console.log("STEP 3: タグ追加後 =", JSON.stringify(withTag));

// STEP 4: もう1つタグを追加してから、includeで一緒に取得する
await prisma.tag.create({ data: { label: "おすすめ", bookId: first.id } });
const withTags = await prisma.book.findUnique({ where: { id: first.id }, include: { tags: true } });
console.log("STEP 4: findUnique + include(tags) =", JSON.stringify(withTags?.tags.map((t) => t.label)));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) includeを付けずに findUnique した場合、戻り値の型に tags は
//       含まれる? .tags にアクセスしようとしたらどうなる?
//   (2) 存在しない isbn で upsert を呼んだら(初回)、update と create の
//       どちらの内容がDBに反映される?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const withoutInclude = await prisma.book.findUnique({ where: { id: first.id } });
console.log("変えてみる (1): includeなしの戻り値のキー =", Object.keys(withoutInclude ?? {}));
console.log("        ↑ tags キーが無い。TypeScriptの型上も存在しないので、"
  + "コード上で .tags と書こうとした瞬間にコンパイルエラーになる。");

const brandNew = await prisma.book.upsert({
  where: { isbn: "978-2" }, // 初めて見るisbn
  update: { title: "この値は使われない", author: "誰か" },
  create: { isbn: "978-2", title: "新規作成される値", author: "誰か" },
});
console.log("変えてみる (2): 初回upsertの結果タイトル =", brandNew.title, "(createの内容が使われる)");

// --- 書いてみる ---------------------------------------------------------
// 課題: 「isbnで冪等に取り込み、同時に1個のタグも必ず付いている状態にする」
//       関数 ingestBookWithTag を完成させてください。
async function ingestBookWithTag(
  isbn: string,
  title: string,
  author: string,
  tagLabel: string,
): Promise<{ bookId: number; tagCount: number }> {
  // ここに書く
  // 1. prisma.book.upsert で本を冪等に作成/更新する(where: isbn)
  // 2. prisma.tag.create で本にタグを1件作る(bookIdは1で得たid)
  // 3. その本に紐づくタグの件数を prisma.tag.count({ where: { bookId } }) で数える
  // 4. { bookId, tagCount } を返す

  return { bookId: -1, tagCount: -1 }; // ← 仮の戻り値。書き換えてください
}

// upsertが本当に冪等かどうかは「呼ぶ前後で本の総数が何件増えたか」で確認する
// (idの具体的な数字は upsert の内部実装依存で変わりうるので、ここでは見ない)。
const bookCountBefore = await prisma.book.count();
const first3 = await ingestBookWithTag("978-9999", "書いてみる用の本", "著者X", "新着");
const bookCountAfter = await prisma.book.count();
const result3 = {
  bookCountIncreasedByOne: bookCountAfter - bookCountBefore === 1,
  tagCount: first3.tagCount,
};

// 後片付け
await prisma.$disconnect();
fs.rmSync(lab, { recursive: true, force: true });

check("概念3: ingestBookWithTag", result3,
  { bookCountIncreasedByOne: true, tagCount: 1 },
  "bookCountIncreasedByOne が false なら、まだupsertを呼んでいない(未記入のまま)か、" +
  "createではなくupsert以外の方法で複数行作ってしまっている。" +
  "tagCount が -1 や 1以外なら、tag.createとtag.countの呼び出しを見直す。");

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
 * prisma.book.upsert({where,update,create}) … 一意キーで「あれば更新・無ければ作成」
 * include: { 関連モデル名: true }              … 関連データを1クエリでまとめて取得
 * data: { 関連モデル名: { create: {...} } }    … 更新と同時に関連行をネストして作成
 *
 * upsertのwhereに使えるのは一意制約が付いたフィールドだけ(このユニットでは
 * isbn)。includeを付けなければ関連データは戻り値に含まれず、型の上でも
 * 存在しない——「必要な分だけ取りに行く」設計がPrismaの基本姿勢。
 *
 * 次: ex04_capstone で、「取り込み実行を1件記録し、そこに属する本を
 * 複数作る」処理を $transaction でまとめ、途中失敗時のロールバックを
 * 確認します。
 * ===================================================================== */
