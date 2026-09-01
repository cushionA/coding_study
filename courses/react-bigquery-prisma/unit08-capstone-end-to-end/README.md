# unit08: キャップストーン — 取り込みから検索UIまで一気通貫

unit01で描いた3層構成の地図、unit02の壊れにくい取り込みクライアント、
unit03/04のPrisma、unit05のBigQuery、unit06のExpress API、unit07のReact —
ここまで7ユニットで積み上げた部品を、このユニットで1本のアプリとして
結線する。今日のゴールは、検索デバウンス・二重書き込み・degrade設計という
「複数システムをまたぐ実務アプリ」特有の3つの設計判断を、自分の手で
実装しコードで説明できるようになることだ。

## なぜ学ぶか

実務で「取り込み→保存→表示」の小さなアプリを一人で任されたとき、
個々の技術要素(fetch・Prisma・BigQuery・Express・React)を知っているだけでは
足りない。本当に難しいのは**部品の継ぎ目**にある: 検索ボックスは1文字ごとに
APIを叩いていいのか? 2つのデータストアに書き込むとき、片方が落ちたら
どう扱うべきか? 集計機能が落ちたときに一覧まで巻き添えにしていいのか?
これらは技術書には書いていない、実際に手を動かして初めて体に入る設計判断。

## 概念: このユニットで固める3つの設計判断

- **デバウンス**: 入力のたびにAPIを叩くと、サーバへの負荷だけでなく
  「速い返信が遅い返信より先に来て画面が巻き戻る」競合状態も生む。
  C#の`System.Timers.Timer`をキー入力のたびにリセットするのと同じ発想で、
  「入力が止まってから一定時間後」だけ検索を確定させる。
- **正と副本(dual-write)**: Prisma(アプリDB)とBigQuery(分析用)は別々の
  システムなので、C#の`TransactionScope`のような「両方まとめてロール
  バック」はできない。だから**正を1つ決め**(ここではPrisma)、副本への
  書き込み失敗は握りつぶさずログに残しつつ、取り込み自体は成功扱いにする。
  突合できるように取り込みバッチID(batchId)を両方に持たせる。
- **degrade設計**: 検索一覧(Prisma)と著者別集計(BigQuery)を1画面に
  出すとき、集計が落ちても一覧まで止める理由は無い。「主役の失敗は
  即座に伝え、脇役の失敗は隠れた形で吸収する」という非対称な
  エラーハンドリングを書けるようになる。

## 進め方

`ex01_search_input.tsx`から順に開き、TODOを埋めて

```
npx vitest run unit08-capstone-end-to-end/tests/ex01.test.tsx
```

(cwdは`courses/react-bigquery-prisma/`)が通れば次へ。詰まったら
`hints/exNN.md`をtier1から順に読む。React部分(ex01・ex04)は
`npm run dev`のViteプレビューで実際の画面を見ながら進められる。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_search_input | 制御コンポーネント+デバウンスで検索入力を作る | 15分 |
| ex02_ingest_dual_write | 外部API→Prisma(正)→BigQuery(分析副本)の冪等な二重書き込み | 20分 |
| ex03_search_endpoint | Prisma検索+BigQuery集計を1レスポンスに束ね、degrade設計にする | 15分 |
| ex04_capstone | ex01とex03を結線し、検索語入力から結果表示までの一連を1画面にする | 10分 |

すべて`BookRepositoryLike`/`AnalyticsWriterLike`のような最小インターフェースに
fake実装(インメモリ)を注入する形で完結する。実GCP・実DB・外部通信は一切不要。

## 実際に一人で立ち上げる(このセクションは自動採点対象外)

このユニットの演習はfakeで完結するが、実務ではここまでの部品を実際に
起動して結線する。以下は最小構成での起動手順の骨子(コースREADMEの
「BigQueryを実際に動かすための前提」を先に済ませておくこと)。

1. **環境変数**(コースディレクトリの`.env`、`.gitignore`済み):
   ```
   DATABASE_URL=file:./dev.db          # Prisma(SQLite)の接続先
   GOOGLE_APPLICATION_CREDENTIALS=...   # BigQueryのサービスアカウント鍵(任意)
   GCP_PROJECT_ID=...                   # BigQueryのプロジェクトID(任意)
   BQ_DATASET=app_analytics             # BigQueryのデータセット名(任意)
   EXTERNAL_API_URL=http://localhost:4010  # 取り込み元(mock-api-server)
   PORT=3001                            # ExpressバックエンドAPIのポート
   ```
2. **起動する順番**(別々のターミナルで):
   ```
   npm run mock-api      # 取り込み元の外部APIをlocalhost:4010で起動
   # unit06のcreateApp()相当をlistenさせる自前のserver.tsを用意して起動 # バックエンドAPI
   npm run dev            # Vite開発サーバ(React)
   ```
   (演習の`createApp()`はテスト用にHTTPサーバを直接listenしない設計なので、
   実際に動かすには`app.listen(PORT)`を呼ぶ数行のエントリポイントを自分で
   足す必要がある — これも実務で必ず通る作業)
   その後、取り込みジョブ(unit08のingestBooks相当)を1回実行してPrisma/
   BigQueryにデータを入れ、ブラウザでUIから検索して結果が出ることを確認する。
3. **確認シナリオ**: 取り込みジョブ実行 → Prismaにデータが入る(BigQueryが
   無くても取り込みは成功する) → ブラウザで検索語を入力 → デバウンス後に
   一覧が表示される → BigQueryが未設定でも一覧自体は表示される(degrade)。

この手順を自分の言葉で(何が正で何が副本か、どこで失敗しても致命的では
ないかを含めて)説明できることが、このユニット最後のマイルストーン。

## マイルストーン(全部チェックできたらユニット完了、そしてコース完了)

- [ ] 制御コンポーネント+デバウンスで検索入力を作り、無駄なリクエストを
      抑えられる
- [ ] 外部API→Prisma(正)→BigQuery(分析副本)の二重書き込みを冪等に
      実装できる
- [ ] 2ストア間で原子性が取れないことを踏まえた整合方針(正の決定・
      部分失敗の扱い・突合キー)を説明できる
- [ ] Prisma検索とBigQuery集計を1レスポンスに束ね、片方の障害でも
      一覧を返すdegrade設計にできる
- [ ] 取り込み→保存→API→UI検索の全経路を、環境変数と起動手順込みで
      一人で立ち上げて説明できる
