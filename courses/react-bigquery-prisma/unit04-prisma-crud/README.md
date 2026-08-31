# unit04: Prismaで型安全にCRUDする

このユニットを終えると、生成された `PrismaClient` で「検索付き一覧」
「重複しない取り込み」「関連データの一括取得」「複数書き込みの原子性」
という、実務のバックエンドで毎日書く4つの型の処理を書けるようになる。

## なぜ学ぶか

unit03では `schema.prisma` を書いて `PrismaClient` を組み立てるところ
までをやった。今日からはその先——実際に画面や取り込みジョブが必要と
する形でデータを読み書きする番。

- 一覧画面には必ず「検索」「並び替え」「ページング」「件数表示」が付いて回る。
- 外部APIやCSVからの取り込みは、同じデータを何度実行しても重複行を
  作ってはいけない(バッチが再実行されることは実務では日常茶飯事)。
- 「本1冊」と「その本に付くタグ」のように、1つのレコードが複数の
  関連レコードを持つ構造はほぼ全てのアプリに出てくる。
- 「取り込み実行を1件記録し、そこに属する本を複数作る」ような処理は、
  途中で1件でも失敗したら全部なかったことにしないと、データが壊れる。

## 概念: PrismaのクエリとC#(EF Core / LINQ)の対応

- Prismaのクエリは**式ツリーではなくオブジェクトリテラル**で書く。
  `where: { title: { contains: q } }` はLINQの
  `.Where(b => b.Title.Contains(q))` に相当するが、メソッドチェーンでは
  なく1個のオプションオブジェクトに全部詰め込む。
- `upsert` はEF Coreで自分で書く「`FirstOrDefault` → 存在チェック →
  `Update` か `Add`」を1メソッドに圧縮したもの。一意なキー(このユニット
  ではISBN)で「同じ行かどうか」を判定する。
- `include` はEF Coreの `.Include(b => b.Tags)` に相当し、関連する
  子テーブルのデータを1回のクエリでまとめて取得する。
- `$transaction(async (tx) => { ... })` はEF Coreで複数の `Add` を
  積んでおいて最後に1回だけ `SaveChanges()` するのと同じ発想。コール
  バックの中で例外が起きれば、そこまでの変更はすべて自動でロール
  バックされる。

## 進め方

`lesson/` のファイルを概念順に読み、`npx tsx lesson/01_....ts` のように
実行しながら「予測する→変える→書く」を1本ずつ終わらせる。そのあと
`ex01_create_read.ts` から順にTODOを埋め、

```
npx vitest run unit04-prisma-crud/tests/ex01.test.ts
```

(cwdは `courses/react-bigquery-prisma/`)が通れば次へ進む。詰まったら
`hints/exNN.md` を tier1 から順に読む。

`prisma/` ディレクトリには、実際に検証済みの `schema.prisma` /
`prisma.config.ts` と、そこから `npx prisma generate` /
`npx prisma migrate dev --name init` を実行して得られた `migrations/` /
`generated/prisma/`(生成済みPrismaClient)が入っている。演習の関数は
すべてこの生成済みクライアントの型をそのまま使う。

## スキーマ設計

```
Book  ---- (1対多、Bookが1) ----  Tag        1冊の本に複数のタグが付く
IngestRun ---- (1対多、IngestRunが1) ----  Book   1回の取り込みが複数の本を生む
```

`Book.isbn` は `@unique`(冪等な取り込みのキーに使う)。`Book.ingestRunId`
はnull許容(単発でBookを作る分には取り込み実行が無くてもよいため)。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_create_read | create/findMany/findUnique/update/deleteの基本CRUD | 10分 |
| ex02_filter_search | contains・orderBy・take/skip・countで検索付き一覧 | 15分 |
| ex03_upsert_relations | upsertによる冪等な取り込み + includeでの1対多取得 | 15分 |
| ex04_capstone | $transactionで複数書き込みをまとめ、失敗時にロールバック | 15分 |

## マイルストーン(全部チェックできたらユニット完了)

- [ ] create / findMany / findUnique / update / delete を型安全に書き分けられる
- [ ] where の contains・orderBy・take/skip・count を組み合わせて
      「検索付き一覧」に必要なクエリを書ける
- [ ] upsert を使い、同じ外部データを何度取り込んでも重複しない冪等な
      保存関数を書ける
- [ ] 1対多リレーションを定義し、include でネストしたデータを1クエリで
      取得できる
- [ ] $transaction で複数の書き込みをまとめ、途中失敗時に中途半端な
      状態を残さない書き方ができる
