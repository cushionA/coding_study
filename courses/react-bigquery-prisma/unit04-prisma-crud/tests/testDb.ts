// テスト専用の共有ヘルパー(採点対象ではない・スケルトンではない)。
// ex01〜ex04のどのテストも「テストごとに新しい使い捨てSQLiteファイルを作り、
// migration.sql と同じ内容のCREATE TABLEを直接流し込んでからPrismaClientを渡す」
// という同じ手順が必要になるため、ここに1本化してある(unit03のex04テストと同じ手法)。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// このユニットの prisma/migrations/*/migration.sql と同じ内容。
export const CREATE_TABLE_SQL = `
CREATE TABLE "Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestRunId" INTEGER,
    CONSTRAINT "Book_ingestRunId_fkey" FOREIGN KEY ("ingestRunId") REFERENCES "IngestRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    CONSTRAINT "Tag_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "IngestRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
CREATE INDEX "Book_author_idx" ON "Book"("author");
CREATE INDEX "Book_ingestRunId_idx" ON "Book"("ingestRunId");
CREATE INDEX "Tag_bookId_idx" ON "Tag"("bookId");
`;

export type TestDb = {
  dbFilePath: string;
  tmpDir: string;
  // ドライバアダプタ経由でPrismaClientを組み立てるためのadapterオプション。
  // (テストは USE_SOLUTIONS の値によって別々の client.js から PrismaClient を
  //  import するため、PrismaClient自体はここでは組み立てず、材料だけ返す)
  adapterOptions: { url: string };
};

// 使い捨てのSQLiteファイルを一時ディレクトリに作り、テーブルを作成済みの状態で返す。
export function createTestDb(): TestDb {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "unit04-crud-"));
  const dbFilePath = path.join(tmpDir, "app.db");
  const rawDb = new Database(dbFilePath);
  rawDb.pragma("foreign_keys = ON");
  rawDb.exec(CREATE_TABLE_SQL);
  rawDb.close();
  return { dbFilePath, tmpDir, adapterOptions: { url: `file:${dbFilePath}` } };
}

export function cleanupTestDb(db: TestDb): void {
  fs.rmSync(db.tmpDir, { recursive: true, force: true });
}

export { PrismaBetterSqlite3 };
