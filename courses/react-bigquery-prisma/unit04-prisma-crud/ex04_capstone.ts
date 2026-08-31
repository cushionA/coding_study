// ex04_capstone: $transaction で複数の書き込みをまとめ、原子性(all or nothing)を保証する。
//
// ここまでの演習は「1回のPrisma呼び出し = 1回のSQL」だったが、実務では
// 「取り込み実行(IngestRun)を1件記録し、そこに属する本を複数件作る」のように、
// 複数の書き込みをまとめて1つの単位として扱いたい場面が必ず出てくる。
// 途中の1件が失敗した(例: isbnの重複で一意制約違反)ときに、
// 「IngestRunだけ作られて本は0件」のような中途半端な状態を残してはいけない。
//
// C#で言えば、EF Coreで複数の Add を呼んでおいて最後に1回だけ
// `dbContext.SaveChanges()` する(=1つのDBトランザクションにまとまる)のと
// 同じ発想。Prismaでは prisma.$transaction(async (tx) => { ... }) のコールバックの
// 中で「tx.モデル名.メソッド」を呼ぶと、その中の全操作が1つのトランザクションになる
// (引数の tx は prisma とほぼ同じ形をした、トランザクション専用のクライアント)。
// コールバックの中で例外が投げられると、Prismaはそこまでの変更を自動でロールバックする。

import type { PrismaClient, Book, IngestRun } from "./prisma/generated/prisma/client.js";

export type IngestBookInput = {
  title: string;
  author: string;
  isbn?: string;
};

export type IngestRunWithBooks = IngestRun & { books: Book[] };

// 1回の取り込み(source)として、複数の本をまとめて登録する。
// books のどれか1件でも作成に失敗したら(例: isbn重複)、
// IngestRun自体も含めて何も残らない状態にすること(= 全体をロールバック)。
// 成功時は、作成されたIngestRunを紐づくbooks込みで返す。
export async function ingestBooksAtomically(
  prisma: PrismaClient,
  source: string,
  books: IngestBookInput[],
): Promise<IngestRunWithBooks> {
  // TODO: prisma.$transaction(async (tx) => { ... }) を使う。
  //  1. tx.ingestRun.create でIngestRunを1件作る
  //  2. books を順番に処理し、tx.book.create で1件ずつ作る。
  //     このとき data.ingestRunId に手順1で作った行のidを入れて紐づける
  //     (どこかで失敗したら、この関数から投げ直す必要はない。
  //      awaitしているPromiseがrejectされれば、Prismaが自動でロールバックする)
  //  3. 全件作り終えたら、tx.ingestRun.findUniqueOrThrow(...) を
  //     include: { books: true } 付きで呼び、その結果をreturnする
  //     (このreturn文がコールバック全体の戻り値になり、
  //      $transaction(...) の戻り値としてそのまま返ってくる)
  throw new Error("TODO: 未実装");
}
