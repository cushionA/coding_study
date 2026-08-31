/* =====================================================================
 * 概念2: 検索付き一覧 —— contains / orderBy / take・skip / count
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   実務の一覧画面には、ほぼ必ず「キーワードで絞り込む」「並び替える」
 *   「ページングする」「総件数を出す(◯件中1〜20件目)」の4点セットが
 *   付いてきます。今日はこの4つをPrismaのオプションオブジェクトとして
 *   組み合わせる書き方を身につけます。
 *
 * ■ 解説:
 *
 *   ● where はメソッドチェーンではなく「1個のオブジェクト」
 *   C#のLINQなら
 *       query.Where(b => b.Title.Contains(q)).Where(b => b.Rating > 3)
 *   のようにメソッドを重ねますが、Prismaは
 *       where: { title: { contains: q }, rating: { gt: 3 } }
 *   のように**条件を1個のオブジェクトのキーとして並べる**だけで「かつ」
 *   になります(暗黙のAND)。「OR」にしたいときだけ `OR: [...]` を使います。
 *
 *   ● フィルタ演算子はフィールドの値ではなく「条件オブジェクト」
 *       { title: "こころ" }              … 完全一致(今まで通り)
 *       { title: { contains: "ここ" } }  … 部分一致(LIKE '%ここ%'に近い)
 *       { rating: { gt: 3 } }            … より大きい (greater than)
 *       { rating: { gte: 3 } }           … 以上 (greater than or equal)
 *   Prismaはフィールドの型ごとに使える演算子キーを型で絞ってくれるので、
 *   文字列フィールドに `gt` を書こうとすると赤線が出ます。
 *
 *   ● orderBy / take / skip
 *       orderBy: { rating: "desc" }   … 評価が高い順
 *       take: 10                     … 最大10件
 *       skip: 20                     … 先頭から20件飛ばす
 *   「2ページ目(1ページ10件)」は `skip: 10, take: 10` になります。
 *   `skip` は「ページ番号」ではなく「飛ばす件数」である点に注意
 *   (C#の `Skip(n).Take(m)` と全く同じ意味なので、LINQ経験があれば
 *   むしろ馴染みやすいはずです)。
 *
 *   ● count は findMany とは別メソッド
 *   「全部取ってきて `.length` を数える」のは件数が多いと非効率です。
 *   `prisma.book.count({ where })` のように、findManyと**同じ where**を
 *   渡せば、DB側で件数だけを数えて返してくれます(SQLの `COUNT(*)` に
 *   相当)。一覧の総件数表示には必ずこちらを使います。
 *
 *   ● このファイルで使う新しいAPI
 *     ・where: { title: { contains } }  … 部分一致フィルタ
 *     ・orderBy: { field: "asc"|"desc" } … 並び替え
 *     ・take / skip                      … 件数制限・オフセット(ページング)
 *     ・prisma.book.count(options?)      … 条件に合う件数だけを取得
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
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson02-"));
const dbFilePath = path.join(lab, "app.db");
const rawDb = new Database(dbFilePath);
rawDb.pragma("foreign_keys = ON");
rawDb.exec(CREATE_TABLE_SQL);
rawDb.close();
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFilePath}` });
const prisma = new PrismaClient({ adapter });

// テストデータ: タイトルに"実践"を含む本を2冊、含まない本を3冊
await prisma.book.create({ data: { title: "実践Prisma入門", author: "山田", rating: 3.5 } });
await prisma.book.create({ data: { title: "実践TypeScript", author: "田中", rating: 4.8 } });
await prisma.book.create({ data: { title: "銀河鉄道の夜", author: "宮沢賢治", rating: 4.0 } });
await prisma.book.create({ data: { title: "こころ", author: "夏目漱石", rating: 2.5 } });
await prisma.book.create({ data: { title: "坊っちゃん", author: "夏目漱石", rating: 3.0 } });

// --- 見る(worked example) ---------------------------------------------
// GOAL: 4点セットをそれぞれ単独で見てから、組み合わせる。

// STEP 1: 部分一致
const contains実践 = await prisma.book.findMany({ where: { title: { contains: "実践" } } });
console.log("STEP 1: containsで絞り込み =", JSON.stringify(contains実践.map((b) => b.title)));

// STEP 2: 並び替え(評価が高い順)
const byRatingDesc = await prisma.book.findMany({ orderBy: { rating: "desc" } });
console.log("STEP 2: orderBy(rating desc) =", JSON.stringify(byRatingDesc.map((b) => b.rating)));

// STEP 3: ページング(1ページ目・2件ずつ、id昇順)
const page1 = await prisma.book.findMany({ orderBy: { id: "asc" }, take: 2, skip: 0 });
const page2 = await prisma.book.findMany({ orderBy: { id: "asc" }, take: 2, skip: 2 });
console.log("STEP 3: page1 =", JSON.stringify(page1.map((b) => b.title)));
console.log("STEP 3: page2 =", JSON.stringify(page2.map((b) => b.title)));

// STEP 4: count(全件・絞り込み後)
const totalAll = await prisma.book.count();
const totalContains = await prisma.book.count({ where: { title: { contains: "実践" } } });
console.log("STEP 4: count(全件) =", totalAll, " / count(実践を含む) =", totalContains);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) where と orderBy と take/skip を**同時に**同じfindManyに渡したら、
//       Prismaはどの順番で処理する?(先に絞り込む? 先に並び替える?
//       先にページングする?)
//   (2) 絞り込み条件に合う本が0冊のとき、count は何を返す?
//       findMany は何を返す?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const combined = await prisma.book.findMany({
  where: { title: { contains: "夏目" } }, // 著者名で絞り込んでみる(タイトルではない点に注意)
  orderBy: { rating: "asc" },
  take: 1,
  skip: 0,
});
console.log("変えてみる (1): where(author contains)+orderBy+take を同時に =", JSON.stringify(combined));
console.log("        ↑ タイトルに『夏目』は含まれないので0件。containsはフィールド単位——");
console.log("          著者で絞りたいなら author フィールドに contains を書く必要がある。");

const fixed = await prisma.book.findMany({
  where: { author: { contains: "夏目" } },
  orderBy: { rating: "asc" },
  take: 1,
  skip: 0,
});
console.log("変えてみる (2): author に contains を書き直すと =", JSON.stringify(fixed.map((b) => b.title)));

const zeroCount = await prisma.book.count({ where: { title: { contains: "存在しない単語" } } });
console.log("変えてみる (3): 該当0件のcount =", zeroCount, "(0は0のまま。エラーにはならない)");

// --- 書いてみる ---------------------------------------------------------
// 課題: 「著者名で絞り込み、rating の高い順に並べ、先頭N件だけを返す」
//       関数 topRatedBooksByAuthor を完成させてください。
// ヒント(概念レベル): where(author の完全一致)・orderBy(rating desc)・take
//   の3つを同時に1個のオプションオブジェクトに詰め込むだけです。
async function topRatedBooksByAuthor(author: string, limit: number): Promise<string[]> {
  // ここに書く
  // 1. prisma.book.findMany に where(author), orderBy(rating desc), take(limit) を渡す
  // 2. 戻り値からtitleだけを取り出した配列を返す

  return []; // ← 仮の戻り値。書き換えてください
}

const result2 = await topRatedBooksByAuthor("夏目漱石", 1);

// 後片付け
await prisma.$disconnect();
fs.rmSync(lab, { recursive: true, force: true });

check("概念2: topRatedBooksByAuthor", result2,
  ["坊っちゃん"],
  "空配列のままなら、まだfindManyを呼んでいない(未記入のまま)。" +
  "件数が合わなければtakeを渡し忘れている。順番が違うならorderByの向き(asc/desc)を確認する" +
  "(夏目漱石の本はこころ:2.5、坊っちゃん:3.0なので、rating順で先頭1件は坊っちゃん)。");

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
 * where: { field: { contains } }   … 部分一致フィルタ(フィールドごとに書く)
 * where に複数キーを並べる         … 暗黙のAND(すべての条件を満たす行)
 * orderBy: { field: "asc"|"desc" } … 並び替え
 * take / skip                      … 件数制限 / 先頭から飛ばす件数(ページング)
 * prisma.book.count(options?)      … findManyと同じwhereで件数だけ取る
 *
 * これら4つは同じオプションオブジェクトの並列なキーなので、組み合わせる
 * ときも「新しい書き方」は要らない——今まで見た書き方をそのまま並べるだけ。
 *
 * 次: ex03_upsert_relations で、「同じデータを何度取り込んでも重複しない」
 * upsert と、1対多リレーションのinclude取得を学びます。
 * ===================================================================== */
