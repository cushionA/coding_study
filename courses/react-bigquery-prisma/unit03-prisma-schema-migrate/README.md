# unit03: Prismaのスキーマとマイグレーション

このユニットを終えると、要件から `schema.prisma` の model を起こし、
`prisma migrate dev` でDBに反映し、Prisma 7 の構成で `PrismaClient` を
組み立てて1回クエリを打てるようになる。これがunit04以降のCRUD・unit08の
取り込みジョブすべての土台になる。

## なぜ学ぶか(このコース最重要の「なぜ」)

このコースにはDBが2つ出てくる: Prisma+SQLite(アプリDB)と BigQuery(分析
DB)。混同しやすいが役割がまったく違う。

- **Prisma / SQLite(このユニット)= OLTP**: 「本を1冊登録する」「検索して
  一覧を返す」のような、少量のデータを正確に読み書きするトランザクション
  処理が仕事。実務のWebアプリのバックエンドが直接触るのはほぼ常にこちら。
- **BigQuery(unit05)= OLAP**: 「著者別に何冊あるか」のような、大量データ
  を横断的に集計する分析が仕事。1件ずつの読み書きには向かない代わりに、
  数百万行のスキャンが得意。

そして実務でよく誤解される点: **Prisma経由でBigQueryは扱えない**。
Prisma公式はBigQueryをサポートしておらず(このコース作成時点で
`@prisma/adapter-bigquery` のようなものはnpmに存在しない)、BigQueryは
公式クライアント `@google-cloud/bigquery` で直接叩く(unit05で扱う)。
「ORMが1つあれば全DBに使い回せる」という発想は通用せず、**データストアの
特性に応じて別々の道具を選ぶ**のが実務の姿勢だと最初に腹落ちさせておきたい。

## 概念: PrismaとC#(EF Core)の対応

- **schema.prisma = DbContext + エンティティクラスを1ファイルに凝縮した
  もの**。`model Book { ... }` はC#の `class Book { ... }` + Fluent API
  設定にあたる。フィールド型は `String` / `Int` / `Float` / `Boolean` /
  `DateTime`、末尾の `?` がC#の `Nullable<T>`(参照型なら `string?`)。
- **属性**: `@id` `@default(autoincrement())` `@unique` は、それぞれ
  EF Coreの `[Key]` `IDENTITY` `[Index(IsUnique = true)]` に近い。
  `@@index([author])` はブロック全体に付く複合インデックス指定。
- **`prisma migrate dev` = `dotnet ef migrations add` + `database update`
  を1コマンドにしたもの**。実行すると `migrations/<timestamp>_<name>/
  migration.sql` が生成され、それがそのまま履歴になる(EF Coreの
  `Migrations/*.cs` の Up/Down にあたるが、Prismaは生SQLがそのまま見える
  ので中身を読むのがむしろ簡単)。本番運用では `migrate deploy`(生成済み
  migrationを適用するだけ、生成はしない)を使う。
- **Prisma 7の破壊的変更(このコースで実際に踏んだ罠)**: `generator` の
  `provider` は `"prisma-client"`(旧 `prisma-client-js` ではない)+
  `output` 明示が必須。SQLite等のSQL系DBは「ドライバアダプタ」
  (`@prisma/adapter-better-sqlite3`)を経由しないと繋がらない。CLI用の
  接続情報は `prisma.config.ts` に書く(`datasource` ブロックに `url` を
  書くと `P1012` エラーになる)。
- **SQLite→Postgresの差し替え**: `schema.prisma` の `datasource.provider`
  を `"postgresql"` に変えるだけでモデル定義はそのまま使い回せる。ただし
  アダプタ(`@prisma/adapter-pg` 等)や接続文字列、SQL方言由来の細かい
  挙動差(型の丸め方など)は別途調整が要るので「1行で万事解決」ではない。

## 進め方

`ex01_read_schema.ts` から順に開き、TODO を埋めて

```
npx vitest run unit03-prisma-schema-migrate/tests/ex01.test.ts
```

(cwdは `courses/react-bigquery-prisma/`)が通れば次へ。詰まったら
`hints/exNN.md` を tier1 から順に読む。

`prisma/` ディレクトリには、実際に検証済みの `schema.prisma` /
`prisma.config.ts` と、そこから実際に `npx prisma generate` /
`npx prisma migrate dev --name init` を実行して得られた `migrations/` /
`generated/prisma/`(生成済みPrismaClient)が入っている。自動テストは
CLIを毎回起動しない設計だが、余裕があれば `prisma/` ディレクトリで
実際にコマンドを打って、同じ結果になることを自分の目で確かめてみてほしい。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_read_schema | schema.prisma文字列を解析し、model/field/属性を読み取る | 10分 |
| ex02_write_model | フィールド定義から model ブロックの文字列を組み立てる | 10分 |
| ex03_migrate_flow | migration.sqlを解析し、テーブル/カラム/インデックス/null許容を読み取る | 15分 |
| ex04_capstone | 実際に生成されたPrismaClientを組み立て、create→findManyを実行する | 15分 |

ex01〜ex03はCLIを起動しない純粋な文字列処理(高速・決定的)。ex04だけ
実際に `npx prisma generate` 済みのPrismaClientを使い、テストごとに
使い捨てのSQLiteファイルへ直接 `CREATE TABLE` を流し込んでから実行する
(migrate自体の学習はex03で済んでいるので、ex04では「生成されたクライアント
を正しく使えるか」に集中する)。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] PrismaがアプリDB担当・BigQueryが分析担当である理由と、なぜPrisma経由で
      BigQueryを扱わないかを自分の言葉で説明できる
- [ ] 要件(欲しい一覧画面・検索条件)から model を起こし、@id / @unique /
      @@index / null 許容を適切に付けられる
- [ ] `prisma migrate dev` でマイグレーションを作成・適用し、`migrations/`
      の中身が何かを説明できる
- [ ] Prisma 7 のドライバアダプタ構成で PrismaClient を生成し、シングルトン
      として共有できる
- [ ] SQLite→Postgres の差し替えが `schema.prisma` の1行で済むことと、
      その限界を説明できる
