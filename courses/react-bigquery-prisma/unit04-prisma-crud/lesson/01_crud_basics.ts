/* =====================================================================
 * 概念1: prisma.book の基本CRUD(= DbContext.Books に対するCRUD)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit03で「PrismaClientを正しく組み立てる」ところまでをやりました。
 *   今日からはそのクライアントを使って、実際に画面やAPIが必要とする
 *   処理——1件作る・全件見る・1件だけ見る・書き換える・消す——を書きます。
 *   これは「本を1冊登録する」「一覧を出す」「編集する」「削除する」という、
 *   Webアプリのバックエンドで最も回数の多い処理そのものです。
 *
 * ■ 解説:
 *
 *   ● prisma.<モデル名> という入口
 *   schema.prisma に `model Book { ... }` と書くと、生成された
 *   PrismaClient には `prisma.book` というプロパティが生え、そこに
 *   create / findMany / findUnique / update / delete などのメソッドが
 *   自動で揃います(モデル名は小文字始まりになる)。
 *
 *   C#でのDbContextとの対応:
 *
 *       Prisma                          EF Core
 *       prisma.book.create({data})      dbContext.Books.Add(x); SaveChanges();
 *       prisma.book.findMany()          dbContext.Books.ToList()
 *       prisma.book.findUnique({where}) dbContext.Books.Find(id)
 *       prisma.book.update({where,data})entity.X = y; SaveChanges();
 *       prisma.book.delete({where})     dbContext.Books.Remove(x); SaveChanges();
 *
 *   大きな違いは、Prismaは**呼んだ瞬間にDBへ実行される**こと(EF Coreの
 *   ように変更を貯めておいて最後に`SaveChanges()`、という2段階ではない)。
 *   1回のメソッド呼び出し = 1回のSQL、と考えてよいです。
 *
 *   ● where と data という2つの箱
 *   update / delete / findUnique はどれも「どの行を対象にするか」を
 *   `where` というオプションで受け取ります。updateはさらに「何を書き換える
 *   か」を `data` という別の箱で受け取ります。この2つを混ぜて書かない
 *   (`where`に書き換え後の値を書く、といった間違いをしない)のがコツです。
 *
 *   ● findUnique と findMany の違い
 *   findUnique は「一意なキー(id や @unique が付いたフィールド)で
 *   ちょうど1件」を取る専用メソッドで、見つからなければ null。
 *   findMany は「条件に合う0件以上」を配列で返す(条件無しなら全件)。
 *
 *   ● このファイルで使う新しいAPI
 *     ・prisma.book.create({ data })         … 1件作る
 *     ・prisma.book.findMany(options?)       … 条件に合う複数件を配列で取る
 *     ・prisma.book.findUnique({ where })    … 一意キーで1件だけ取る(無ければnull)
 *     ・prisma.book.update({ where, data })  … 1件を書き換える
 *     ・prisma.book.delete({ where })        … 1件消す
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

// --- 実験場の準備(このユニット全レッスン共通のテーブル定義) --------------
// prisma/migrations/*/migration.sql と同じ内容を直接流し込み、
// migrate CLIを起動せず高速・決定的にテーブルを用意する。
const here = path.dirname(fileURLToPath(import.meta.url));
const CREATE_TABLE_SQL = fs.readFileSync(
  path.join(here, "..", "prisma", "migrations", "20260831105353_init", "migration.sql"),
  "utf8",
);
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson01-"));
const dbFilePath = path.join(lab, "app.db");
const rawDb = new Database(dbFilePath);
rawDb.pragma("foreign_keys = ON");
rawDb.exec(CREATE_TABLE_SQL);
rawDb.close();
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFilePath}` });
const prisma = new PrismaClient({ adapter });

// --- 見る(worked example) ---------------------------------------------
// GOAL: create → findMany → findUnique → update → delete を通しでやる。

// STEP 1: 1冊作る。戻り値には id と createdAt がDB側で自動で入る。
const created = await prisma.book.create({ data: { title: "吾輩は猫である", author: "夏目漱石" } });
console.log("STEP 1: create の戻り値 =", JSON.stringify(created));

// STEP 2: もう2冊作ってから、全件を見る。
await prisma.book.create({ data: { title: "こころ", author: "夏目漱石" } });
await prisma.book.create({ data: { title: "銀河鉄道の夜", author: "宮沢賢治" } });
const all = await prisma.book.findMany({ orderBy: { id: "asc" } });
console.log("STEP 2: findMany(全件) =", JSON.stringify(all.map((b) => b.title)));

// STEP 3: idを1つ指定して1件だけ取る。
const one = await prisma.book.findUnique({ where: { id: created.id } });
console.log("STEP 3: findUnique(id指定) =", JSON.stringify(one?.title));

// STEP 4: 存在しないidを指定するとどうなるか。
const missing = await prisma.book.findUnique({ where: { id: 999999 } });
console.log("STEP 4: 存在しないidのfindUnique =", missing);

// STEP 5: 書き換える。where(対象)とdata(内容)は別の箱。
const updated = await prisma.book.update({ where: { id: created.id }, data: { rating: 4.8 } });
console.log("STEP 5: update後 =", JSON.stringify(updated));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) STEP 5 で rating だけを書き換えたが、title や author はどうなる?
//       (data に書かなかったフィールドは消える? 元のまま残る?)
//   (2) 存在しないidに対して update や delete を呼ぶと、
//       findUnique のように null が返ってくる? それとも別の挙動になる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
console.log("変えてみる (1): update後もtitleは残っている =", updated.title === "吾輩は猫である");

let deleteError: string | null = null;
try {
  await prisma.book.delete({ where: { id: 999999 } });
} catch (err) {
  deleteError = (err as Error).constructor.name;
}
console.log("変えてみる (2): 存在しないidをdeleteした結果 = 例外の種類:", deleteError);
console.log("        ↑ findUniqueは『無ければnull』だが、update/deleteは『対象が無ければ例外』。");
console.log("          『0件かもしれない検索』と『1件を確実に操作する』は挙動が違うと覚えておく。");

// --- 書いてみる ---------------------------------------------------------
// 課題: 「本を1冊作り、そのidで削除し、削除後に同じidをfindUniqueした結果」
//       を求める関数 createThenDelete を完成させてください。
//       戻り値は「削除された行のtitle」と「削除後にfindUniqueした結果(null期待)」の組。
// ヒント(概念レベル): このファイルのSTEP 1・STEP 5の逆(delete)・STEP 3〜4 の
//   組み合わせでしかありません。新しいAPIはもう出てきません。
async function createThenDelete(title: string, author: string): Promise<{ deletedTitle: string; afterDelete: unknown }> {
  // ここに書く
  // 1. prisma.book.create でidをもらう
  // 2. そのidで prisma.book.delete する(戻り値のtitleを覚える)
  // 3. 同じidで prisma.book.findUnique する
  // 4. { deletedTitle, afterDelete } を返す

  return { deletedTitle: "", afterDelete: undefined }; // ← 仮の戻り値。書き換えてください
}

const result1 = await createThenDelete("坊っちゃん", "夏目漱石");

// 後片付け
await prisma.$disconnect();
fs.rmSync(lab, { recursive: true, force: true });

check("概念1: createThenDelete", result1,
  { deletedTitle: "坊っちゃん", afterDelete: null },
  "deletedTitle が空文字なら、まだ create/delete を呼んでいない(未記入のまま)。" +
  "afterDelete が undefined のままなら、findUnique の呼び出しを追加していない" +
  "(findUniqueの結果が無ければ自動でnullになる。undefinedのまま返さないこと)。");

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
 * prisma.book.create({data})       … 1件作る。戻り値に自動生成された値も入る
 * prisma.book.findMany(opts?)      … 条件に合う複数件。条件無しなら全件
 * prisma.book.findUnique({where})  … 一意キーで1件。無ければnull(例外にならない)
 * prisma.book.update({where,data}) … 対象1件を書き換える。無ければ例外
 * prisma.book.delete({where})      … 対象1件を消す。無ければ例外
 *
 * 「無ければnull」なのはfindUniqueだけ。update/deleteは「対象が実在する
 * こと」を前提にした操作なので、無ければ例外——この非対称を覚えておく。
 *
 * 次: ex02_filter_search で、この一覧取得を「検索付き一覧」
 * (部分一致・並び替え・ページング・件数)に育てます。
 * ===================================================================== */
