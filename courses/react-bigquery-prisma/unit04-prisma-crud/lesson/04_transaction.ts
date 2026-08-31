/* =====================================================================
 * 概念4: $transaction で複数の書き込みをまとめる(原子性)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここまでの演習は、1回のPrisma呼び出し = 1回のSQL文でした。しかし
 *   実務では「取り込み実行(IngestRun)を1件記録し、そこに属する本を
 *   複数件作る」のように、複数の書き込みをひとまとまりの単位として
 *   扱いたい場面が必ず出てきます。途中の1件が失敗した(例: isbnの重複で
 *   一意制約違反)のに、「IngestRunだけ作られて本は0件」のような中途
 *   半端な状態がDBに残ってしまうと、後で必ずバグの温床になります
 *   (unit08の「二重書き込み」の回にも直結する話です)。
 *
 * ■ 解説:
 *
 *   ● $transaction にコールバックを渡す(interactive transaction)
 *       await prisma.$transaction(async (tx) => {
 *         const run = await tx.ingestRun.create({ data: { source } });
 *         await tx.book.create({ data: { title, author, ingestRunId: run.id } });
 *         return tx.ingestRun.findUniqueOrThrow({
 *           where: { id: run.id },
 *           include: { books: true },
 *         });
 *       });
 *   コールバックの引数 `tx` は、普段の `prisma` とほぼ同じ形をした
 *   「トランザクション専用のクライアント」です。`prisma.book.create` の
 *   代わりに `tx.book.create` と書くだけで、その呼び出しが同じ
 *   トランザクションに参加します。
 *
 *   C#で言えば、EF Coreで複数の `Add` を積んでおいて最後に1回だけ
 *   `SaveChanges()` する(=1つのDBトランザクションにまとまる)のと同じ
 *   発想。ただしPrismaは「コールバックの中で書いた順に、その場で
 *   実行される」点がEF Coreと違います(EF Coreは変更を貯めて最後に
 *   まとめて送るが、Prismaのinteractive transactionは1文ずつ即座に
 *   実行し、コミット/ロールバックだけを最後にまとめて判断します)。
 *
 *   ● ロールバックは自動 —— catchで握りつぶさない
 *   コールバックの中で例外が投げられると(例えば一意制約違反で
 *   PrismaClientKnownRequestErrorが飛ぶ)、Prismaはそこまでの変更を
 *   自動的にすべて取り消します。呼び出し側でtry/catchするのは自由
 *   ですが、コールバックの**内側**でその例外をもみ消してしまうと、
 *   ロールバックすべきかどうかをPrismaが判断できなくなります。
 *   「途中で失敗したら投げっぱなしでよい」がこの機能の使い方の要点です。
 *
 *   ● このファイルで使う新しいAPI
 *     ・prisma.$transaction(async (tx) => { ... })
 *          … コールバック内の全操作を1つのトランザクションにまとめる。
 *            コールバックの戻り値がそのまま $transaction(...) の戻り値になる。
 *     ・tx.モデル名.メソッド(...)
 *          … コールバック内では prisma の代わりに tx を使う。
 *    ・findUniqueOrThrow
 *          … findUniqueと同じだが、見つからなければ例外を投げる
 *            (「作ったはずなのに無い」という起こり得ないケースのnullチェックを省ける)。
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
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-lesson04-"));
const dbFilePath = path.join(lab, "app.db");
const rawDb = new Database(dbFilePath);
rawDb.pragma("foreign_keys = ON");
rawDb.exec(CREATE_TABLE_SQL);
rawDb.close();
const adapter = new PrismaBetterSqlite3({ url: `file:${dbFilePath}` });
const prisma = new PrismaClient({ adapter });

// --- 見る(worked example) ---------------------------------------------
// GOAL: 成功するトランザクションと、失敗してロールバックされるトランザクションを両方見る。

// STEP 1: 成功パターン —— IngestRunと本2冊をまとめて作る
const successRun = await prisma.$transaction(async (tx) => {
  const run = await tx.ingestRun.create({ data: { source: "feed-ok" } });
  await tx.book.create({ data: { title: "取込本1", author: "取込著者", ingestRunId: run.id } });
  await tx.book.create({ data: { title: "取込本2", author: "取込著者", ingestRunId: run.id } });
  return tx.ingestRun.findUniqueOrThrow({ where: { id: run.id }, include: { books: true } });
});
console.log("STEP 1: 成功時の戻り値 =", JSON.stringify(successRun));

// STEP 2: 事前に isbn "978-dup" を持つ本を1冊作っておく(失敗を起こすための仕込み)
await prisma.book.create({ data: { title: "既存本", author: "既存著者", isbn: "978-dup" } });

// STEP 3: 失敗パターン —— 2件目でisbn重複を起こし、ロールバックされることを確認
const beforeRunCount = await prisma.ingestRun.count();
const beforeBookCount = await prisma.book.count();
let failedAsExpected = false;
try {
  await prisma.$transaction(async (tx) => {
    const run = await tx.ingestRun.create({ data: { source: "feed-bad" } });
    await tx.book.create({ data: { title: "新規本1", author: "新規著者", ingestRunId: run.id } });
    // ↓ isbnが既存の本と重複しているので、ここで一意制約違反が起きる
    await tx.book.create({ data: { title: "重複本", author: "新規著者", isbn: "978-dup", ingestRunId: run.id } });
  });
} catch (err) {
  failedAsExpected = err instanceof Error && err.message.toLowerCase().includes("unique");
}
const afterRunCount = await prisma.ingestRun.count();
const afterBookCount = await prisma.book.count();
console.log("STEP 3: 一意制約違反で失敗した?", failedAsExpected);
console.log("STEP 3: ロールバック確認 =", JSON.stringify({ beforeRunCount, afterRunCount, beforeBookCount, afterBookCount }));
console.log("        ↑ IngestRunも『新規本1』も、一切増えていないはず(2件目が失敗したので1件目も巻き戻る)。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) STEP 3 で「新規本1」の作成は成功していた(重複していない)のに、
//       なぜ afterBookCount は増えなかった?
//   (2) もし tx.book.create をtry/catchで囲んでその場でエラーを
//       握りつぶしたら($transactionのコールバックの外に例外が伝わらない
//       ようにしたら)、ロールバックは起きる? 起きない?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// コールバックの中で例外を握りつぶすとどうなるかを実際に確認する
const beforeRunCount2 = await prisma.ingestRun.count();
await prisma.$transaction(async (tx) => {
  const run = await tx.ingestRun.create({ data: { source: "feed-swallowed" } });
  try {
    await tx.book.create({ data: { title: "重複本2", author: "誰か", isbn: "978-dup", ingestRunId: run.id } });
  } catch {
    // ここで握りつぶしてしまうと、Prismaは「エラーが起きた」ことを知らないまま
    // コールバックが正常終了したと判断し、ロールバックしない。
  }
});
const afterRunCount2 = await prisma.ingestRun.count();
console.log("変えてみる: コールバック内でcatchして握りつぶした場合の IngestRun 件数 変化 ="
  , { beforeRunCount2, afterRunCount2 });
console.log("        ↑ IngestRunは増えてしまう(ロールバックされない)。"
  + "『失敗したら投げっぱなしにする』のが正しい使い方だと分かる。");

// --- 書いてみる ---------------------------------------------------------
// 課題: 「取り込み実行を1件作り、渡された本を1件だけ作って、両方が
//        紐づいた状態のIngestRunをincludeで返す」関数
//        ingestOneBook を完成させてください(失敗時は自然に例外が伝播すればよい)。
async function ingestOneBook(
  source: string,
  title: string,
  author: string,
  isbn?: string,
): Promise<{ source: string; bookTitles: string[] }> {
  // ここに書く
  // 1. prisma.$transaction(async (tx) => { ... }) を使う
  // 2. コールバックの中で tx.ingestRun.create → tx.book.create(ingestRunIdを紐づけ) の順で呼ぶ
  // 3. tx.ingestRun.findUniqueOrThrow({ where, include: { books: true } }) で
  //    紐づく本ごと取得して return する
  // 4. $transactionの戻り値(3のオブジェクト)から
  //    { source: 戻り値.source, bookTitles: 戻り値.books.map(b => b.title) } を返す

  return { source: "", bookTitles: [] }; // ← 仮の戻り値。書き換えてください
}

const result4 = await ingestOneBook("feed-final", "最終確認用の本", "著者Y");

// 後片付け
await prisma.$disconnect();
fs.rmSync(lab, { recursive: true, force: true });

check("概念4: ingestOneBook", result4,
  { source: "feed-final", bookTitles: ["最終確認用の本"] },
  "sourceが空文字のままなら、まだ$transactionを呼んでいない(未記入のまま)。" +
  "bookTitlesが空配列のままなら、tx.book.createを呼んでいないか、" +
  "includeを付けずに戻り値を組み立てている。");

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
 * prisma.$transaction(async (tx) => { ... })
 *     … コールバック内の全操作を1つのトランザクションにまとめる。
 *       コールバックの戻り値が $transaction(...) の戻り値になる。
 * コールバック内では prisma ではなく tx を使う
 *     … tx.book.create / tx.ingestRun.create のように書く。
 * ロールバックは自動・ただし「例外が外まで伝わること」が条件
 *     … コールバック内でcatchして握りつぶすと、Prismaは失敗に気づけず
 *       コミットしてしまう。「失敗したら投げっぱなし」が鉄則。
 * findUniqueOrThrow
 *     … 「作ったはずなのに無い」を起こり得ないものとして扱い、
 *       nullチェックの手間を省く。
 *
 * これでunit04は完了。create/findMany/findUnique/update/delete の基本、
 * contains・orderBy・take/skip・countの検索付き一覧、upsertの冪等性、
 * 1対多リレーションのinclude、$transactionの原子性——実務のバックエンドで
 * 毎日使う一式が揃いました。
 *
 * 次のunit05では、ここまでとは全く違う道具(BigQuery)で「大量データの
 * 集計」を学びます。Prisma/SQLiteが「1件を正確に」の世界だったのに対し、
 * BigQueryは「大量を横断して集計する」世界——同じ「データを扱う」でも
 * 目的が違えば道具も設計も変わることを、今日の対比表を思い出しながら
 * 進めてください。
 * ===================================================================== */
