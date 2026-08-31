// ex02_filter_search: 「検索付き一覧」を組み立てるための4点セット
// —— 部分一致(contains) / 並び替え(orderBy) / ページング(take・skip) / 件数(count)。
//
// C#のLINQ to Entitiesで言えば
//   query.Where(b => b.Title.Contains(q))
//        .OrderBy(b => b.Rating)
//        .Skip((page - 1) * pageSize).Take(pageSize)
// を1本の式でつなぐのに近いが、Prismaは「メソッドチェーン」ではなく
// find系メソッドに渡す**1個のオプションオブジェクト**にすべて詰め込む。
// where / orderBy / take / skip はどれもそのオブジェクトの並列なキーであって、
// 呼び出し順は関係ない(SQLに翻訳されるときにまとめて解釈される)。

import type { PrismaClient, Book, Prisma } from "../../unit04-prisma-crud/prisma/generated/prisma/client.js";

// タイトルに keyword を含む本だけを返す(部分一致・大小区別あり)。
export async function searchBooksByTitle(prisma: PrismaClient, keyword: string): Promise<Book[]> {
  return prisma.book.findMany({ where: { title: { contains: keyword } } });
}

// rating(評価)で並び替えた本の一覧を返す。rating が null の行の扱いはPrisma任せでよい。
export async function listBooksSortedByRating(
  prisma: PrismaClient,
  direction: "asc" | "desc",
): Promise<Book[]> {
  return prisma.book.findMany({ orderBy: { rating: direction } });
}

// 1ページ分の本と、絞り込み条件に合致する総件数をまとめて返す。
// page は1始まり(1ページ目 = 先頭から pageSize 件)。
// keyword が渡されたときだけタイトルの部分一致で絞り込む(undefinedなら絞り込まない)。
export async function paginateBooks(
  prisma: PrismaClient,
  page: number,
  pageSize: number,
  keyword?: string,
): Promise<{ items: Book[]; total: number }> {
  const where: Prisma.BookWhereInput = keyword === undefined ? {} : { title: { contains: keyword } };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { id: "asc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.book.count({ where }),
  ]);

  return { items, total };
}
