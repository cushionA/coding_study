# TypeScript Webスクレイピング入門 (web-scraping-ts)

TypeScript の標準 `fetch` と cheerio で、Web ページから欲しいデータを取り出す一連の流れを一人で書けるようになるコース。

## コース目標

**実在サイト相当の HTML から、取得 → 解析 → 整形 → CSV 出力のスクレイパーを、エラー処理とマナー(robots.txt / レート制限)込みで一人で書ける。**

## 「実務参加可能レベル」の定義

このコースを終えたとき、以下を他人の助けなしに一人で完結できる状態を指す。

- HTML の DOM ツリー構造を理解し、目的のデータがどのタグ・属性にあるか自分で見つけられる
- cheerio の `$(selector)` / `.find` / `.each` / `.text()` / `.attr()` でタグ・属性・テキストを的確に抽出できる
- 表(table)や繰り返し構造(商品カード・リスト)を `Array<Record<string, string>>` の構造化データに整形できる
- 欠損セル・想定外構造・取得失敗に対して防御的に書ける(`try/catch`・`?.` / `??` フォールバック・スキップとログ)
- robots.txt を自前で解析して巡回可否を判定し、Crawl-delay / レート制限・適切な User-Agent・HTTP 429 の作法を守れる
- 上記を「取得 → 解析 → 整形 → CSV 出力」の一連のパイプラインとして、複数ページ相当の対象に対して自力で組み立てられる

## 対象学習者

- C# 経験あり(AtCoder 茶色、OOP 理解あり)
- TypeScript は C# に近い言語(静的型・ジェネリクス・`async`/`await`・アロー関数 = ラムダ)なので、C# のアナロジー(`string` / `List<T>` / `Dictionary<K,V>` / LINQ の `Select`・`Where`・`First`、XML ノード走査、`StreamWriter`/CsvHelper など)を強く効かせて解説する
- TS 固有の落とし穴(構造的型付け、`null` / `undefined` とオプショナルチェーン `?.` / `??`、ESM の `import` 構文)は序盤ユニットで足場を作る

## 前提環境

- Node.js v22(標準 `fetch` / `fs` / `path` / `URL` を使用)
- cheerio 1.x(インストール済み)/ 実行 tsx / テスト vitest(インストール済み・**追加インストール不可**)
- robots.txt 解析・CSV 出力は Node 標準機能で自前実装する(Node には標準 robotparser も CSV ライブラリも無いため、ミニパーサ / 自前ライタを書く演習にしている)
- **全課題・全レッスンは外部ネットワーク不使用。** 題材はすべて `courses/web-scraping-ts/data/` 配下のローカル HTML フィクスチャ。HTTP 通信は概念として学び、演習では `fetch` の戻り値相当のダミー Response オブジェクトやローカルファイル読込で代替する。

## ユニット一覧

| # | ユニット | 内容 | 所要時間 |
|---|---------|------|---------|
| 1 | unit01-html-and-ts-basics | HTML/DOM の構造と、TS の型・文字列操作・配列メソッド(map/filter=LINQ)・オブジェクト/Record の足場 | 50分 |
| 2 | unit02-cheerio-basics | cheerio での解析(`$` 探索・`.each` 反復・テキスト/属性抽出・ツリー走査) | 55分 |
| 3 | unit03-selectors-and-tables | CSS セレクタと表・リストの抽出(複数抽出・table 解析・オブジェクト配列整形・防御的アクセス) | 55分 |
| 4 | unit04-fetch-and-manners | fetch 通信とマナー(async/await の Response・robots.txt 自前パーサ・User-Agent・レート制限/429) | 55分 |
| 5 | unit05-robust-and-csv | 堅牢化と CSV 出力(クレンジング・型変換・例外処理/リトライ・自前 CSV ライタ) | 55分 |
| 6 | unit06-capstone-scraper | キャップストーン: 複数ページ相当の一覧→詳細巡回をマナー込みで CSV 出力 | 60分 |

各ユニットは課題4個構成(micro → variant → medium → capstone の難易度勾配)+ lesson スクリプト 3〜4 本。合計の目安は約 5.5 時間。

## 進め方(各ユニット共通の3ステップ)

コマンドはすべて **コースディレクトリ `courses/web-scraping-ts/` を cwd** にして実行する。

1. `/study` でセッションを開始する。チューターが背景と今日のゴールをガイダンスしてくれる。
2. **README → lesson スクリプト → 演習** の順に進む:
   - `README.md` — なぜ学ぶかの地図(2分)
   - `lesson/NN_*.ts` — 概念を「読む→予測する→変えてみる→書いてみる」で身につける(20〜30分)。VS Code でファイルを開き、`npx tsx unitNN-*/lesson/NN_*.ts` で実行 → 出力の `[OK]` / `[NG]` を見ながら「書いてみる」ブロックを編集して再実行する
   - `exNN_*.ts` — テスト駆動の演習。TODO を埋めて `npx vitest run unitNN-*/tests` が通れば合格。lesson を見ながらで OK
3. 詰まったら Claude に聞く(段階的にヒントをくれる。いきなり答えは来ない)。

課題は前から順に(後半ほど難しくなる)。合格ごとに自動でコミットされ、学習履歴が残る。セッション終了時には学習ノートが `notes/` に生成される。
