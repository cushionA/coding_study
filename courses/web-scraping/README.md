# Python Webスクレイピング入門 (web-scraping)

Python の requests と BeautifulSoup で、Web ページから欲しいデータを取り出す一連の流れを一人で書けるようになるコース。

## コース目標

**実在サイト相当の HTML から、取得 → 解析 → 整形 → CSV 出力のスクレイパーを、エラー処理とマナー(robots.txt / レート制限)込みで一人で書ける。**

## 「実務参加可能レベル」の定義

このコースを終えたとき、以下を他人の助けなしに一人で完結できる状態を指す。

- HTML の DOM ツリー構造を理解し、目的のデータがどのタグ・属性にあるか自分で見つけられる
- BeautifulSoup の `find` / `find_all` / `select` でタグ・属性・テキストを的確に抽出できる
- 表(table)や繰り返し構造(商品カード・リスト)を `list[dict]` の構造化データに整形できる
- 欠損セル・想定外構造・取得失敗に対して防御的に書ける(例外処理・フォールバック・スキップとログ)
- robots.txt を読んで巡回可否を判定し、Crawl-delay / レート制限・適切な User-Agent・HTTP 429 の作法を守れる
- 上記を「取得 → 解析 → 整形 → CSV 出力」の一連のパイプラインとして、複数ページ相当の対象に対して自力で組み立てられる

## 対象学習者

- C# 経験あり(AtCoder 茶色、OOP 理解あり)
- Python 経験は浅い(文字列・辞書・リスト操作の足場を序盤ユニットに織り込む)
- 各ユニットで C# のアナロジー(`string` / `List<T>` / `Dictionary<K,V>` / LINQ の `Select`・`Where`、XML ノード走査、CsvHelper など)を用いて解説する

## 前提環境

- Python 3.13
- requests 2.32.5 / beautifulsoup4 4.14.3(インストール済み・**追加インストール不可**)
- robots.txt 解析・CSV 出力は Python 標準ライブラリ(`urllib.robotparser` / `csv`)を使用
- **全課題・全レッスンは外部ネットワーク不使用。** 題材はすべて `courses/web-scraping/data/` 配下のローカル HTML フィクスチャ。HTTP 通信は概念として学び、演習では `requests.get` の戻り値相当のダミー Response オブジェクトやローカルファイル読込で代替する。

## ユニット一覧

| # | ユニット | 内容 | 所要時間 |
|---|---------|------|---------|
| 1 | unit01-html-and-python-basics | HTML/DOM の構造と、Python の文字列・リスト内包表記・辞書操作の足場 | 50分 |
| 2 | unit02-beautifulsoup-basics | BeautifulSoup での解析(find/find_all・テキスト/属性抽出・ツリー走査) | 55分 |
| 3 | unit03-selectors-and-tables | CSS セレクタと表・リストの抽出(select・table 解析・list[dict] 整形・防御的アクセス) | 55分 |
| 4 | unit04-http-and-manners | HTTP 通信とマナー(requests の API・robots.txt・User-Agent・レート制限/429) | 55分 |
| 5 | unit05-robust-and-csv | 堅牢化と CSV 出力(クレンジング・型変換・例外処理/リトライ・csv.DictWriter) | 55分 |
| 6 | unit06-capstone-scraper | キャップストーン: 複数ページ相当の一覧→詳細巡回をマナー込みで CSV 出力 | 60分 |

各ユニットは課題4個構成(micro → variant → medium → capstone の難易度勾配)。合計の目安は約 5.5 時間。

## 進め方(各ユニット共通の3ステップ)

1. `/study` でセッションを開始する。チューターが背景と今日のゴールをガイダンスしてくれる。
2. **README → lesson.ipynb → 演習** の順に進む:
   - `README.md` — なぜ学ぶかの地図(2分)
   - `lesson.ipynb` — 概念を「読む→予測する→変えてみる→書いてみる」で身につける(20〜30分)。チェックポイントセルが即時採点してくれる
   - `exNN_*.py` — テスト駆動の演習。TODO を埋めて `python -m pytest <unit>/tests/test_exNN.py -q` が通れば合格。lesson を見ながらで OK
3. 詰まったら Claude に聞く(段階的にヒントをくれる。いきなり答えは来ない)。

課題は前から順に(後半ほど難しくなる)。合格ごとに自動でコミットされ、学習履歴が残る。セッション終了時には学習ノートが `notes/` に生成される。
