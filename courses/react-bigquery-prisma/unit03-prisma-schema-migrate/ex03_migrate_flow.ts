// ex03_migrate_flow: `prisma migrate dev` が生成する migration.sql を読み解く練習。
//
// 実際に手を動かして確認したい場合は unit ディレクトリの prisma/ で
//   npx prisma generate
//   npx prisma migrate dev --name init
// を実行してみるとよい(README参照)。ただし自動テストは毎回CLIを起動すると
// 数秒かかり不安定になりやすいため、実際にそのコマンドで生成された
// migration.sql をそのままこのファイルに埋め込み、文字列解析だけで
// 「migrations/ の中身が何を意味するか」を学べるようにしている。
//
// C#で言えば、EF Core の `dotnet ef migrations add` が生成する
// `Migrations/<timestamp>_Init.cs`(Up/Down メソッドの中身)を読むのと同じ感覚。
// Prisma の場合は素のSQLがそのまま出てくるので、読むのはむしろ簡単。

// 下記は本ユニットの prisma/schema.prisma に対して実際に
// `npx prisma migrate dev --name init` を実行して得られた migration.sql そのもの。
export const SAMPLE_MIGRATION_SQL = `-- CreateTable
CREATE TABLE "Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");

-- CreateIndex
CREATE INDEX "Book_author_idx" ON "Book"("author");
`;

// `CREATE TABLE "テーブル名" ( ... );` のうち、丸括弧の中身だけを取り出す。
// 見つからない場合は null。(提供済み: そのまま使ってよい)
function extractCreateTableBody(sql: string, tableName: string): string | null {
  const match = sql.match(new RegExp(`CREATE TABLE "${tableName}" \\(([\\s\\S]*?)\\n\\);`));
  return match ? match[1] : null;
}

// CREATE TABLE で作られたテーブル名を、出現順にすべて返す。
export function extractCreatedTableNames(sql: string): string[] {
  // TODO: `CREATE TABLE "テーブル名"` という並びを正規表現でグローバルに検索し、
  // テーブル名だけを配列にして返す
  throw new Error("TODO: 未実装");
}

// 指定テーブルのカラム名一覧を定義順に返す。テーブルが見つからない場合は空配列。
// カラム定義行は `"カラム名" 型 制約...,` の形なので、各行の最初の
// ダブルクオートで囲まれた部分がカラム名になる。
export function extractColumnNames(sql: string, tableName: string): string[] {
  // TODO: extractCreateTableBody で本体を取り出し、行ごとに分割・trimしたうえで
  // 空行を除き、各行から `"カラム名"` の部分(ダブルクオートの中身)を取り出す
  throw new Error("TODO: 未実装");
}

// 指定テーブルの指定カラムが NULL 許容かどうかを判定する。
// (SQLite の CREATE TABLE では、NOT NULL が書かれていなければ NULL 許容)
// テーブルやカラムが見つからない場合は false を返す。
export function isColumnNullable(sql: string, tableName: string, columnName: string): boolean {
  // TODO: extractCreateTableBody で本体を取り出し、`"カラム名"` から始まる行を探し、
  // その行に "NOT NULL" という文字列が含まれていなければ true を返す
  throw new Error("TODO: 未実装");
}

// CREATE INDEX / CREATE UNIQUE INDEX で作られたインデックス名を、出現順にすべて返す。
export function extractCreatedIndexNames(sql: string): string[] {
  // TODO: `CREATE INDEX "名前"` または `CREATE UNIQUE INDEX "名前"` という並びを
  // 正規表現でグローバルに検索し、インデックス名だけを配列にして返す
  throw new Error("TODO: 未実装");
}
