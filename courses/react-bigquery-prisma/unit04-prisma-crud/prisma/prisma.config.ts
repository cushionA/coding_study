// Prisma 7 では CLI (generate / migrate) の接続情報を prisma.config.ts に書く。
// C#で言えば appsettings.json + Program.cs での DbContext 接続文字列設定に相当する。
//
// 学習者がこのユニットで実際に CLI を動かす場合は、このファイルがあるディレクトリで
//   npx prisma generate
//   npx prisma migrate dev --name init
// を実行する(このユニットの自動テストはCLIを起動しない。README参照)。
import path from "node:path";
import { defineConfig } from "prisma/config";

// 注意: PrismaConfig型に "migrate" というキーは存在しない(migrate dev / generate は
// datasource.url だけで完結する)。adapter が必要になるのは実行時の PrismaClient
// インスタンス化のときだけで、prisma.config.ts の役目ではない。
export default defineConfig({
  schema: "schema.prisma",
  datasource: { url: `file:${path.join(__dirname, "app.db")}` },
});
