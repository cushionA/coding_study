// ex04_capstone: 実際に generate された PrismaClient を組み立て、1回クエリを実行する。
// ex01〜ex03は文字列としてのschema/SQLを扱う練習だったが、ここでついに
// 本物の PrismaClient(prisma/generated/prisma に `npx prisma generate` 済み)
// を動かす。CRUDの詳しい操作(検索条件・リレーション等)はunit04の担当なので、
// ここは「正しくクライアントを組み立てられる」「1回 create → findMany できる」
// ところまでがゴール。
//
// C#で言えば、DbContext のインスタンスを正しいコンストラクタ引数
// (接続文字列)で作り、`dbContext.Books.Add(...)`; `dbContext.SaveChanges()`;
// `dbContext.Books.ToList()` を1回ずつ呼ぶのに相当する。
//
// このユニットのテストは、一時ディレクトリに作った使い捨てSQLiteファイルに
// migration.sql相当のCREATE TABLEを直接流し込んでから、この関数群を呼び出す
// (テストごとに新しいファイルを作り、終わったら削除するので後片付け不要)。

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  PrismaClient,
  type Book,
} from "../../unit03-prisma-schema-migrate/prisma/generated/prisma/client.js";

// createBook に渡す入力の形。id / createdAt はDB側が自動生成するので含めない。
export type NewBookInput = {
  title: string;
  author: string;
};

// dbFilePath(絶対パス)の SQLite ファイルに接続する PrismaClient を作って返す。
// Prisma 7 の SQLite は「ドライバアダプタ」経由でしか繋がらない
// (旧来のように datasource.url を直接渡すだけでは動かない)。
export function createPrismaClient(dbFilePath: string): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbFilePath}` });
  return new PrismaClient({ adapter });
}

// 1冊分の本をDBに作成し、作成された行(idやcreatedAtを含む)を返す。
export async function createBook(prisma: PrismaClient, data: NewBookInput): Promise<Book> {
  return prisma.book.create({ data });
}

// 指定した著者名の本だけを取得する(完全一致)。
export async function listBooksByAuthor(prisma: PrismaClient, author: string): Promise<Book[]> {
  return prisma.book.findMany({ where: { author } });
}
