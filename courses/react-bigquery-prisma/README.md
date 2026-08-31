# React × Prisma × BigQuery 実務投入 (react-bigquery-prisma)

仕事で急に必要になった **React + TypeScript + Prisma + BigQuery** のスタックを、
「動くものを一人で組み立てて、なぜその構成なのかを説明できる」ところまで持っていくコース。

## コース目標

**外部APIから取得したデータを Prisma 経由でアプリDBに保存しつつ、BigQuery にも分析用データとして書き込み、
React からバックエンドAPI経由でフェッチして一覧表示・検索できる最小Webアプリを、一人で構築・説明できる。**

## このコースで作るもの(全体像)

```
  外部API (取り込み元)
      │  fetch + zod検証 + リトライ          [unit02]
      ▼
  取り込みジョブ (Node/TypeScript)           [unit08]
      ├──▶ Prisma ──▶ アプリDB (SQLite)      [unit03/04]  ← 正 (OLTP)。一覧・検索の本体
      └──▶ @google-cloud/bigquery ──▶ BigQuery [unit05]   ← 分析副本 (OLAP)。集計・履歴

  ブラウザ (React + Vite)                    [unit07]
      │  fetch("/api/books?q=...")
      ▼
  バックエンドAPI (Express)                  [unit06]  ← 鍵・接続情報はここより内側だけ
      ├──▶ Prisma (検索・一覧)
      └──▶ BigQuery (集計サマリ)
```

### 設計上の重要な決定(最初に知っておくこと)

1. **Prisma は BigQuery を扱わない。** Prisma 公式は BigQuery をサポートしておらず
   (2026年8月時点で `@prisma/adapter-bigquery` 等は npm registry に存在しない)、
   そもそも Prisma は**トランザクショナルDB(OLTP)向けの ORM**、BigQuery は
   **分析用の列指向ウェアハウス(OLAP)**で、解く問題が違う。
   本コースでは Prisma = アプリDB(学習用は SQLite。本番なら Postgres 相当)、
   BigQuery = 公式クライアント `@google-cloud/bigquery` で**直接**叩く、という役割分担を取る。
   この「なぜ」は unit03 で正面から扱う。
2. **サービスアカウント鍵は絶対にフロントエンドに置かない。**
   ブラウザに配られた JS は全世界に公開されたのと同じ。だから React から直接 BigQuery を叩く構成は取らず、
   必ず `React → 自前バックエンドAPI(Express) → BigQuery / Prisma` の3層にする。
   この原則は unit01 で最初に線を引き、unit06 で実装として徹底する
   (Vite が `VITE_` プレフィックスの環境変数をバンドルに焼き込む落とし穴も実演する)。
3. **演習の採点は外部ネットワーク不使用。** 外部APIは `tools/mock-api-server.ts` が
   `http://localhost:4010` で配信するローカルモック、BigQuery は注入した fake クライアント、
   DB は一時 SQLite ファイル。**GCPアカウントが無くても全課題に合格できる。**
   実 GCP への接続は unit05 以降の lesson に「任意の実機確認ステップ」として用意する。

## 「実務参加可能レベル」の定義

このコースを終えたとき、以下を他人の助けなしに一人で完結できる状態を指す。

- 3層構成(ブラウザ / バックエンド / データストア)の**境界線をどこに引くか**を判断し、
  何をサーバ側に置くべきかを理由付きで説明できる
- `async`/`await` と `fetch` で外部APIを叩き、実行時スキーマ検証(zod)・エラー分類・
  リトライ・タイムアウトまで含めた**壊れにくい取り込みクライアント**を書ける
- `schema.prisma` からモデルを設計し、マイグレーションを作成・適用し、
  Prisma Client で型安全な CRUD・検索・ページング・`upsert` による冪等な取り込み・
  リレーションの `include`・`$transaction` を書ける
- BigQuery のデータセット/テーブルを設計し、**パラメータ化クエリ**で安全に読み、
  `insert` で書き、**スキャン量課金**を意識して `dryRun` でコストを見積もれる
- Express で REST エンドポイントを定義し、入口で検証して 400 を返し、
  集中エラーハンドラを置き、route / service / repository に分離して**テストできる形**にできる
- React で props / state / イベント / 一覧描画 / `useEffect` によるデータ取得を書き、
  ローディング・エラー・空・成功の状態を出し分けた一覧+検索画面を作れる
- 上記を「取り込み → 2ストアへの保存 → API → UI検索」の**一気通貫**として組み立て、
  2ストア間で原子性が取れないという現実に対する整合方針を自分で決められる

## 対象学習者と、既習スキルの反映

- C# を主戦力とする実務者(AtCoder茶色、OOP・クラス・インターフェース理解あり)。
  **C#アナロジーを全編で強く使う**: Prisma = EF Core の Code First + DbContext /
  `async`/`await` = C# と同一構文 / Express のミドルウェア = ASP.NET Core のパイプライン /
  React の state = `INotifyPropertyChanged` による宣言的バインディング /
  zod = 実行時の DataAnnotations 検証。
- **圧縮する範囲**: TypeScript の型注釈・文字列操作・配列メソッド(`map`/`filter`/`find` = LINQ の
  `Select`/`Where`/`First`)・オブジェクト/`Record<K,V>` は別コース `web-scraping-ts` で
  level3(ヒントなしで書けた)に到達済みのため、unit01 で5分の復習に圧縮する。
- **丁寧に扱う範囲**: `async`/`await`・Promise・`fetch`・HTTPレスポンスの型・エラー処理/リトライは
  `web-scraping-ts` 側でまだ未着手(level0)なので、**本コースで初出として丁寧に**扱う(unit01/unit02)。
- **完全にゼロ知識前提**: React 全般・Prisma 全般・BigQuery 全般・Express などバックエンドの基礎・
  環境変数によるシークレット管理。API 名を出すときは必ず「何をするものか」を一文添えて説明する。

## 前提環境

- Node.js v22.22.2 / npm 10.9.7(確認済み)
- 主なパッケージ(コースディレクトリで `npm install` を1回):
  react 19.2.8 / vite 8.2.2 / @vitejs/plugin-react 6.1.1 / typescript 7.0.2 / tsx 4.23.13 /
  vitest 4.1.11 / jsdom 30.0.1 / @testing-library/react 16.3.3 / @testing-library/jest-dom 7.0.1 /
  express 5.2.1 / zod 4.5.4 / dotenv 17.4.2 /
  **prisma 7.10.0(安定版)** + @prisma/client 7.10.0 + @prisma/adapter-better-sqlite3 7.10.0 + better-sqlite3 13.0.3 /
  @google-cloud/bigquery 9.0.3
  - Prisma は npm の `latest` が 8.0.0-rc(リリース候補)のため、**安定版の 7.10.0 を明示指定**する。
  - Prisma 7 系は ESM 既定・`prisma.config.ts` 必須・SQLプロバイダにドライバアダプタ必須という
    構成になっている(generator は `provider = "prisma-client"`)。この足場は unit03 で説明する。

### BigQuery を実際に動かすための前提(unit05 以降・任意だが強く推奨)

GCPアカウントが未取得でも**課題は全て合格できる**が、実務では必ず本物に繋ぐことになるので、
unit05 に入る前に以下を通しておくと学習効果が段違いになる。各ユニットのREADMEでも再掲する。

1. **GCPプロジェクトを作る** — https://console.cloud.google.com/ にGoogleアカウントでログインし、
   上部のプロジェクト選択 →「新しいプロジェクト」。プロジェクトID(例 `my-bq-study-001`)を控える。
   請求先アカウントの登録を求められるが、BigQuery には**毎月の無料枠**(クエリ 1TB / ストレージ 10GB)があり、
   本コースの規模なら無料枠に収まる。
2. **BigQuery API を有効化** — 「APIとサービス」→「ライブラリ」→ BigQuery API →「有効にする」。
3. **データセットを作る** — BigQuery コンソール左のプロジェクト名 →「データセットを作成」。
   データセットID `app_analytics`、ロケーション `asia-northeast1`(東京)を推奨。
   ※ データセットのロケーションは後から変更できない。クエリはデータセットと同じロケーションで実行される。
4. **サービスアカウントを作る** — 「IAMと管理」→「サービスアカウント」→「サービスアカウントを作成」。
   ロールは **BigQuery データ編集者(roles/bigquery.dataEditor)** と
   **BigQuery ジョブユーザー(roles/bigquery.jobUser)** の2つを付ける
   (オーナー権限は付けない。必要最小権限が原則)。
5. **JSON鍵を発行する** — 作ったサービスアカウント →「キー」→「鍵を追加」→「新しい鍵を作成」→ JSON。
   ダウンロードされたファイルを **このリポジトリの外**(例 `~/.gcp/bq-study-key.json`)に置く。
   **絶対に git にコミットしない。** リポジトリ内に置く場合は必ず `.gitignore` に追加する。
6. **環境変数を設定する** — コースディレクトリの `.env`(これも `.gitignore` 済み)に:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=C:\Users\<you>\.gcp\bq-study-key.json
   GCP_PROJECT_ID=my-bq-study-001
   BQ_DATASET=app_analytics
   ```
   `GOOGLE_APPLICATION_CREDENTIALS` は Google のクライアントライブラリが**自動で読む**決まった名前の変数
   (ADC = Application Default Credentials)。コードに鍵のパスを直接書かないための仕組み。
7. **接続確認** — unit05 の lesson にスモークテスト用スクリプトを用意する。
   データセット一覧が返ってくれば準備完了。

> 鍵が無い/GCPを使わない場合: unit05 以降の演習は fake の BigQuery クライアントを注入して採点するので、
> そのまま進めて問題ない。lesson の「実機で確かめる」ブロックだけスキップする。

## ユニット一覧

| # | ユニット | 内容 | 所要 |
|---|---------|------|------|
| 1 | unit01-stack-and-async | スタック全体像と境界線 / Promise・async/await(= C# の Task)/ fetch と Response / .env とシークレット | 55分 |
| 2 | unit02-external-api-client | 外部APIクライアント: zod による実行時検証・DTO→ドメイン変換・エラー分類・指数バックオフ・タイムアウト | 55分 |
| 3 | unit03-prisma-schema-migrate | **なぜPrismaでBigQueryを扱わないのか(OLTP/OLAP)** / schema.prisma・model設計・migrate・Prisma 7 の足場 | 55分 |
| 4 | unit04-prisma-crud | 型安全CRUD・検索/並び替え/ページング・冪等な upsert・リレーションと include・$transaction | 60分 |
| 5 | unit05-bigquery-client | GCPセットアップ / データセット・テーブル設計 / パラメータ化クエリ / insert と部分失敗 / スキャン量課金と dryRun | 60分 |
| 6 | unit06-express-api | Express 5 のルーティング・zod入口検証・集中エラーハンドラ・CORS・route/service/repository分離・**鍵の境界** | 60分 |
| 7 | unit07-react-ui | React ゼロから: JSX・props・useState とイベント・map と key・条件描画・useEffect でのデータ取得と4状態設計 | 60分 |
| 8 | unit08-capstone-end-to-end | キャップストーン: 検索UI(制御コンポーネント+デバウンス)・二重書き込み取り込みジョブ・検索エンドポイント・E2E結線 | 60分 |

各ユニットは課題4個構成(micro → variant → medium → capstone の難易度勾配)+ lesson 3〜4本。
合計の目安は約 **7.8 時間**。

## 教材の形式

- **バックエンド系ユニット(1〜6, 8の一部)**: lesson は概念ごとの実行スクリプト
  `lesson/NN_<concept>.ts` を `npx tsx` で実行しながら「見る → 予測する → 変えてみる →
  書いてみる → チェック」で進める。
- **React ユニット(7, 8の一部)**: 同じ構造のまま、Vite 開発サーバ(`npm run dev`)で
  ブラウザに描画を見ながら進める。
- **採点は全ユニット vitest に統一**。React のテストはファイル先頭の
  `/** @vitest-environment jsdom */` で jsdom に切り替え、`@testing-library/react` で
  描画結果とユーザー操作後の振る舞いを検証する。

## 進め方(各ユニット共通)

コマンドはすべて **コースディレクトリ `courses/react-bigquery-prisma/` を cwd** にして実行する。

1. `/study` でセッションを開始する。チューターが背景と今日のゴールをガイダンスしてくれる。
2. **README → lesson → 演習** の順に進む:
   - `README.md` — なぜ学ぶかの地図(2分)
   - `lesson/NN_*.ts` — `npx tsx unitNN-*/lesson/NN_*.ts` で実行 → `[OK]`/`[NG]` を見ながら
     「書いてみる」ブロックを編集して再実行(20〜30分)。React ユニットは `npm run dev` でプレビュー
   - `exNN_*.ts` / `exNN_*.tsx` — TODO を埋めて `npx vitest run unitNN-*/tests` が通れば合格
3. 詰まったら Claude に聞く(tier1 概念 → tier2 方針 → tier3 ほぼ解答、と段階的にヒントが出る。
   いきなり答えは来ない)。

課題は前から順に(後半ほど難しくなる)。合格ごとに自動でコミットされ、学習履歴が残る。
セッション終了時には学習ノートが `notes/` に生成される。
