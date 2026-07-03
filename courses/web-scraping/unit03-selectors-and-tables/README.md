# unit03: セレクタと表・リストの抽出

このユニットを終えると、CSSセレクタで複数レコードを一括抽出し、table要素を行×列のデータに、
繰り返し構造(商品カードやリスト項目)をlist[dict]に変換できるようになる。
さらに欠損セルや不揃いな要素に落ちずに対処できるようになる。

## なぜ学ぶか

実務のHTMLはfind/find_allを1件ずつ辿るには非効率な「同じ構造の繰り返し」だらけだ
(商品一覧、ランキング表、検索結果など)。CSSセレクタを使えば「このクラスを持つ要素すべて」を
1行で拾える。また表形式データはそのままでは使えず、後続のCSV出力(unit05)のためにも
list[dict]という統一フォーマットに変換する必要がある。そして実データには欠損や
クラス名の揺れがつきもので、そこで例外を出して処理全体を止めないための防御的な書き方は、
スクレイパーを「動くけど1件のエラーで全部落ちる」ものにしないための必須スキルだ。

## 概念: PythonとC#の対応

- `soup.select(".card")` はCSSセレクタで要素を一括取得する。C#のLINQで言えば
  `elements.Where(e => e.ClassName == "card")` に相当し、`find_all` より複雑な条件
  (子孫・属性・複数クラス)を1つの文字列で表現できる。
- `select_one(セレクタ)` は最初の1件(無ければNone)を返す。C#の `FirstOrDefault()` と同じ発想で、
  Noneチェックを省略すると呼び出し側で `NullReferenceException` 相当のエラーになる。
- table要素は `thead`/`tbody`/`tr`/`td` の入れ子。C#の `DataTable` を列名でアクセスできる形に
  変換するように、ヘッダとセルを `zip` して辞書化するのがPythonらしいやり方。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_css_select | select/select_oneでクラス・子孫セレクタを使う | 10分 |
| ex02_table_parse | table要素をヘッダ付きlist[dict]に変換する | 15分 |
| ex03_records_cleanup | 欠損・class揺れへの防御的アクセス | 15分 |
| ex04_capstone | 3フィクスチャ横断のフィルタ・集計パイプライン | 15分 |

進め方: `ex01_css_select.py` を開き、TODO を埋めて
`python -m pytest courses/web-scraping/unit03-selectors-and-tables/tests/test_ex01.py -q`
が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] CSSセレクタでクラス名・子孫関係を指定して要素を一括取得できる
- [ ] HTMLのtableをヘッダ付きのlist[dict]に変換できる
- [ ] 商品カードやリスト項目のような繰り返し構造をlist[dict]に整形できる
- [ ] 要素が存在しない(None)場合に備えた防御的なコードが書ける
