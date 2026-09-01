# unit05: BigQueryに分析用データを書き・読む

このユニットを終えると、分析したい問いからBigQueryのテーブルスキーマを設計し、
安全なパラメータ化クエリで読み書きし、部分失敗やコストといった
BigQuery特有の落とし穴を検知できるようになる。unit03/04で作ったPrisma側が
「アプリの正のデータ(OLTP)」を担当するのに対し、ここからは「分析用の副本
(OLAP)」を担当する側の入口になる。

## なぜ学ぶか

Prisma+SQLite/PostgresのようなRDBは「1件の注文」「1人のユーザー」を
正確に更新・削除するのが得意だが、「先月の日別取り込み件数」「著者別の
冊数ランキング」のような大量データの集計には向いていない。BigQueryは
逆に、巨大な列指向テーブルを一括でスキャンして集計するのが得意な
分析用データベース(OLAP)で、実務では「アプリDBに書きつつ、分析用に
BigQueryにも書く」という二重運用がよく出てくる(unit08で実際に作る)。
このユニットでは、その分析側を安全に(SQLインジェクションを作らず、
部分失敗を握りつぶさず、想定外の課金を出さずに)扱う型を身につける。

## 前提: GCPの実セットアップ

GCPプロジェクト作成〜サービスアカウント鍵の発行〜環境変数設定の手順は
コースREADME(`courses/react-bigquery-prisma/README.md`)の
「BigQueryを実際に動かすための前提」にまとめてある。**このユニットの
演習(自動採点)はGCPアカウントが無くても全て合格できる** — 実GCPには
一切接続せず、`BigQueryLike`という最小インターフェースに対してfake実装
(インメモリ)を注入してテストするため。実機に繋いで確かめたい場合は
コースREADMEの手順を先に済ませておくこと。

## 概念: BigQueryとC#(ADO.NET/Dapper)の対応

- **スキーマ定義**: BigQueryのテーブルは列名・型・NULL許容を事前に決める
  配列(`{name, type, mode}`)で表す。型はSTRING/INT64/FLOAT64/BOOL/
  TIMESTAMPなど、C#の`string`/`int`/`double`/`bool`/`DateTime`に近い
  対応がある。
- **パラメータ化クエリ**: `query({ query, params })`は、Dapperの
  `@author`プレースホルダー+匿名オブジェクト、あるいはADO.NETの
  `cmd.Parameters.AddWithValue("@author", value)`に相当する。
  文字列連結でSQLを組み立てると、値に`"`や`--`が混ざった瞬間に
  SQLインジェクションの入口になる。
- **部分失敗(PartialFailureError)**: RDBのINSERTは「全部成功 or
  全部ロールバック」だが、BigQueryのストリーミング挿入は複数行のうち
  一部だけが失敗することがある。C#のトランザクションの感覚では
  起きない挙動なので、明示的に検知してログに残す必要がある。
- **スキャン量課金とdryRun**: BigQueryはスキャンしたバイト数で課金される
  (`SELECT *`は高価、`LIMIT`を付けてもスキャン量自体は減らない)。
  本実行の前に「もし実行したら何バイトスキャンするか」を見積もる
  dryRunは、C#で言えば重い処理の前に`EstimatedCost`を先に計算して
  ガードを入れるのに近い発想。

## 進め方

`ex01_build_schema.ts`から順に開き、TODOを埋めて

```
npx vitest run unit05-bigquery-client/tests/ex01.test.ts
```

(cwdは`courses/react-bigquery-prisma/`)が通れば次へ。詰まったら
`hints/exNN.md`をtier1から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_build_schema | 分析したい問いからテーブルスキーマ(`{name,type,mode}`)を組み立てる | 10分 |
| ex02_param_query | パラメータ化クエリの組み立てと`BigQueryLike.query()`の実行 | 15分 |
| ex03_insert_rows | `table.insert()`と部分失敗(PartialFailureError)の検知・ログ化 | 15分 |
| ex04_capstone | dryRunでコストを見積もってから実行する、を1つの関数にまとめる | 15分 |

すべての演習は`BigQueryLike`という最小インターフェースにfake実装
(インメモリ)を注入する形で完結する。実GCPへの通信は一切行わない。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] GCPプロジェクト作成からサービスアカウント鍵・
      `GOOGLE_APPLICATION_CREDENTIALS`設定までを自分で最後まで通せる
      (またはコースREADMEの手順を見ながら説明できる)
- [ ] 分析したい問い(日別取り込み件数・著者別集計)からテーブル
      スキーマを設計し、型をBigQueryの型に対応づけられる
- [ ] paramsを使ったパラメータ化クエリを書き、文字列連結でSQLを
      組み立ててはいけない理由を説明できる
- [ ] `table.insert()`で行を投入し、PartialFailureErrorによる
      部分失敗を検知してログに残せる
- [ ] BigQueryの課金がスキャン量ベースであることを理解し、dryRunで
      見積もってからクエリを実行できる
