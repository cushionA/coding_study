// ex01_create_read: prisma.book を使った基本CRUD。
// unit03では「クライアントを正しく組み立てる」ところまでがゴールだったが、
// このユニットからはクライアント(PrismaClient)は既に組み立てられた状態で
// 引数として渡ってくる。あなたの仕事は「どのメソッドに・どんな形の
// オプションを渡すか」だけに集中すること。
//
// C#で言えば、DbContext のインスタンスは既に用意されていて、
// dbContext.Books.Add(...) / dbContext.Books.Find(id) / .Update(...) / .Remove(...)
// を書き分ける練習だと思えばよい。Prisma はメソッド名も引数もモデル名から
// 自動生成されるので、prisma.book.xxx の xxx 部分だけを正しく選ぶ。
//
// 型はすべて prisma/generated/prisma/client.js からスキーマ通りに生成されている
// (Book 型に isbn を書き忘れて使おうとすると、この時点でエディタが赤線を出す)。

import type { PrismaClient, Book } from "./prisma/generated/prisma/client.js";

// createBook に渡す入力の形。id / createdAt はDB側が自動生成するので含めない。
export type NewBookInput = {
  title: string;
  author: string;
  isbn?: string;
  rating?: number;
};

// 1冊分の本を作成し、作成された行(id・createdAtを含む)を返す。
export async function createBook(prisma: PrismaClient, input: NewBookInput): Promise<Book> {
  // TODO: prisma.book.create を呼ぶ。渡すオプションのキーは「作りたいデータそのもの」
  throw new Error("TODO: 未実装");
}

// 登録されている本を全件、id の昇順で返す。
export async function listAllBooks(prisma: PrismaClient): Promise<Book[]> {
  // TODO: prisma.book.findMany を呼ぶ。並び順は orderBy: { id: "asc" } を指定する
  throw new Error("TODO: 未実装");
}

// idで1冊だけ取得する。存在しなければ null。
export async function findBookById(prisma: PrismaClient, id: number): Promise<Book | null> {
  // TODO: 主キー(一意なフィールド)で1件だけ取る専用メソッドがある
  throw new Error("TODO: 未実装");
}

// 指定idの本のratingだけを書き換え、更新後の行を返す。
export async function updateBookRating(
  prisma: PrismaClient,
  id: number,
  rating: number,
): Promise<Book> {
  // TODO: prisma.book.update を呼ぶ。「どの行か」と「何を書き換えるか」は別々のキーで渡す
  throw new Error("TODO: 未実装");
}

// 指定idの本を削除し、削除された行を返す。
export async function deleteBook(prisma: PrismaClient, id: number): Promise<Book> {
  // TODO: prisma.book.delete を呼ぶ
  throw new Error("TODO: 未実装");
}
