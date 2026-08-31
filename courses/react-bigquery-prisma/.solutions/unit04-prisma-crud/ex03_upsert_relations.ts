// ex03_upsert_relations: 冪等な取り込み(upsert) と 1対多リレーション(Book 1 ― Tag 多)。
//
// ■ upsert(冪等性)
// 外部APIやCSVから同じ本を何度取り込んでも行が増えない関数を作る。
// 「存在すればUPDATE、なければINSERT」というSQLの定番パターンを、Prismaは
// 1回の呼び出し(upsert)にまとめている。C#でEF Coreを使う場合は
// `FirstOrDefault` → 存在チェック → `Update` or `Add` を自分で書く必要があるが、
// Prismaはこれを1つのメソッドで済ませてくれる(内部的にはDBの一意制約に守られた
// アトミックな操作)。「どの行を指すか」を isbn のような一意なキーで指定する点が肝。
//
// ■ 1対多リレーション + include
// schema.prisma では Tag が bookId で Book を指す形(Book 1 ― Tag 多)。
// C#のEF Coreで言えば、Book.Tags というナビゲーションプロパティを
// `dbContext.Books.Include(b => b.Tags)` で一緒に読み込むのと同じことを、
// Prismaは find系メソッドの include オプションで行う。
// また「本を更新すると同時に、その本に紐づく新しいTagも作る」という
// ネストしたcreateは、update の data の中に関連モデル名をキーとして書く。

import type { PrismaClient, Book, Tag } from "../../unit04-prisma-crud/prisma/generated/prisma/client.js";

export type UpsertBookInput = {
  isbn: string;
  title: string;
  author: string;
  rating?: number;
};

// Book(タグ配列を含む)の形。include: { tags: true } を付けたときの戻り値に対応する。
export type BookWithTags = Book & { tags: Tag[] };

// isbn をキーにして本を冪等に取り込む。
// 既に同じisbnの行があれば title/author/rating を更新し、無ければ新規作成する。
// 何度呼んでも、その isbn の行は常に1件のまま。
export async function upsertBookByIsbn(prisma: PrismaClient, input: UpsertBookInput): Promise<Book> {
  const { isbn, title, author, rating } = input;
  return prisma.book.upsert({
    where: { isbn },
    update: { title, author, rating },
    create: { isbn, title, author, rating },
  });
}

// 指定した本(bookId)に新しいタグを1件追加し、追加後のタグ一覧を含む本を返す。
export async function addTagToBook(
  prisma: PrismaClient,
  bookId: number,
  label: string,
): Promise<BookWithTags> {
  return prisma.book.update({
    where: { id: bookId },
    data: { tags: { create: { label } } },
    include: { tags: true },
  });
}

// 指定した本を、紐づくタグ一覧つきで取得する。存在しなければ null。
export async function getBookWithTags(prisma: PrismaClient, bookId: number): Promise<BookWithTags | null> {
  return prisma.book.findUnique({ where: { id: bookId }, include: { tags: true } });
}
