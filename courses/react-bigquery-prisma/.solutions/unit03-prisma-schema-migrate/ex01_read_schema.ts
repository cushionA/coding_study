// ex01_read_schema: schema.prisma の「文字列」を読み解く練習。
// このユニットではまだ Prisma CLI を起動しない。schema.prisma は結局ただの
// テキストファイルなので、正規表現と文字列操作だけで model / field / 属性を
// 読み取れることを体感するのが目的(CLIが裏で何を解析しているかの土台)。
//
// C#で言えば、.csproj (XML) をXMLパーサに通す前に「テキストとしてどう
// 書かれているか」を目で追うのと同じ感覚。

// このユニット全体で使うサンプルスキーマ(実際に `npx prisma generate` /
// `migrate dev` を通した prisma/schema.prisma と同じ Book モデルを含む)。
export const SAMPLE_SCHEMA = `
generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Book {
  id        Int      @id @default(autoincrement())
  title     String
  author    String
  isbn      String?  @unique
  rating    Float?
  createdAt DateTime @default(now())

  @@index([author])
}

model Author {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
}
`;

// 指定した model ブロックの中身(波括弧の中の文字列)を取り出す。
// 見つからない場合は null を返す。(提供済み: そのまま使ってよい)
function extractModelBlock(schema: string, modelName: string): string | null {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`));
  return match ? match[1] : null;
}

// モデルブロックの中身を「フィールド定義の行だけ」の配列にする。
// @@index / @@unique のようなブロック全体への属性行と空行はここで除外済み。
// (提供済み: そのまま使ってよい)
function fieldLinesOf(modelBlock: string): string[] {
  return modelBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("@@"));
}

// schema 内に定義されている model の名前を、出現順にすべて返す。
// 例: extractModelNames(SAMPLE_SCHEMA) === ["Book", "Author"]
export function extractModelNames(schema: string): string[] {
  const matches = schema.matchAll(/model\s+(\w+)\s*\{/g);
  return Array.from(matches, (m) => m[1]);
}

// 指定した model が持つフィールド名の一覧を、定義順に返す。
// モデルが見つからない場合は空配列を返す。
// フィールド定義行は「フィールド名 型 属性...」の形なので、行の先頭の
// トークン(空白区切りの最初の単語)がフィールド名になる。
export function extractFieldNames(schema: string, modelName: string): string[] {
  const block = extractModelBlock(schema, modelName);
  if (!block) return [];
  return fieldLinesOf(block).map((line) => line.split(/\s+/)[0]);
}

// 指定した model の中で `@unique` 属性が付いているフィールド名の一覧を返す。
// (@@unique のようなブロック単位の複合ユニークはここでは対象外)
export function extractUniqueFieldNames(schema: string, modelName: string): string[] {
  const block = extractModelBlock(schema, modelName);
  if (!block) return [];
  return fieldLinesOf(block)
    .filter((line) => line.includes("@unique"))
    .map((line) => line.split(/\s+/)[0]);
}

// 指定したフィールドが null 許容(型のあとに `?` が付いている)かどうかを返す。
// フィールドが見つからない場合は false を返す。
export function isFieldOptional(schema: string, modelName: string, fieldName: string): boolean {
  const block = extractModelBlock(schema, modelName);
  if (!block) return false;
  const line = fieldLinesOf(block).find((l) => l.split(/\s+/)[0] === fieldName);
  if (!line) return false;
  const type = line.split(/\s+/)[1] ?? "";
  return type.endsWith("?");
}
