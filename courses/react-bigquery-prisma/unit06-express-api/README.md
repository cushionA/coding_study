# unit06: バックエンドAPIを立てる(Express)

このユニットを終えると、React(ブラウザ)と2つのデータストア(Prisma/BigQuery)
の間に立つ、最小構成の自前バックエンドAPIを一人で組み立てられるようになる。
ここがこのコースで「サーバサイドの入口」になる回。

## なぜ学ぶか

これまでのユニットでは外部APIを叩いたり(unit02)、Prismaで直接DBを読み書き
したり(unit03/04)してきた。しかしReactアプリ(ブラウザで動くコード)から
これらを直接呼ぶことはできない。理由は3つ:

1. サービスアカウント鍵やDB接続情報をブラウザに渡すと、その時点で全世界に
   公開されるのと同じ(Viteは`VITE_`が付いた環境変数をビルド時にバンドルへ
   焼き込む。「フロントの.envに鍵を書けば動く」は実務で実際に起きる事故)。
2. ブラウザから直接BigQueryを叩けるようにすると、悪意あるユーザーが任意の
   SQLを実行できてしまう。
3. Prismaの結果とBigQueryの結果を1つのレスポンスにまとめる、といった
   「複数ストアをまたぐ整形」はサーバ側でやるべき仕事。

だから「ブラウザ ⇄ 自前APIサーバ ⇄ DB/BigQuery」という3層構成にし、鍵や
接続情報はサーバ側だけが知っている状態にする。このユニットではその
「自前APIサーバ」をExpressで作る。

## 概念: ExpressとASP.NET Coreの対応

- **ルーティング**: `app.get("/api/books", handler)` は、ASP.NET Coreの
  `[HttpGet("api/books")]`が付いたControllerのアクションメソッドに相当する。
  ただしExpressにはControllerクラスという概念がなく、「パス→関数」を
  直接1本ずつ登録していく。
- **ミドルウェアパイプライン**: Expressのリクエスト処理は、登録した関数を
  順番に通っていくパイプライン。ASP.NET Coreの`app.Use(...)`を積み重ねる
  イメージそのもの。`next()`を呼ぶと次のミドルウェアへ進み、呼ばなければ
  そこで処理が止まる。
- **入口検証(zod)**: ASP.NET CoreのDataAnnotations + モデルバインディングに
  近いが、Expressにはモデルバインディングがないので、`req.query`を
  zodスキーマに自分で通し、失敗したら400を返す処理を自分で書く。
- **集中エラーハンドリング**: ASP.NET Coreの`UseExceptionHandler`に相当する、
  「引数が4つ(`err, req, res, next`)」の特別なミドルウェア。ルート側は
  `throw`するだけでよく、レスポンスの組み立ては1箇所にまとめる。
- **route → service → repository**: ASP.NET Coreの
  Controller → Service → Repository と同じ3層構成。repositoryを
  interfaceとして定義し、本物のPrisma実装とテスト用のfake実装を
  差し替えられるようにする。

## 進め方

`ex01_first_route.ts`から順に開き、TODOを埋めて

```
npx vitest run unit06-express-api/tests/ex01.test.ts
```

(cwdは`courses/react-bigquery-prisma/`)が通れば次へ。詰まったら
`hints/exNN.md`をtier1から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_first_route | GET /api/books(一覧)とGET /api/books/:id(1件・404)を定義する | 10分 |
| ex02_validate_query | zodでクエリパラメータを検証し、不正なら400+理由を返す | 15分 |
| ex03_error_layering | 集中エラーハンドリングミドルウェアで400/404/500を出し分ける | 15分 |
| ex04_capstone | route/service/repositoryの3層構成にし、fake repositoryでテストする | 15分 |

テストは`supertest`でExpressアプリを直接叩く(実際にポートをlistenしない)。
実DB・実BigQueryへの接続は不要で、すべてメモリ上のデータかfake実装で完結する。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] GET /api/books?q=... のようなエンドポイントを定義し、クエリパラメータを
      受けてJSONを返せる
- [ ] 入口でzod検証を行い、不正なリクエストに400と理由を返せる
- [ ] 集中エラーハンドラを置き、想定外の例外でもスタックトレースを漏らさず
      500を返せる
- [ ] route/service/repositoryを分離し、repositoryを差し替えてHTTPレベルの
      テストが書ける
- [ ] なぜ鍵をフロントに置けないか(ViteのVITE_プレフィックスの罠を含む)を
      実演つきで説明できる(lessonで扱う)
