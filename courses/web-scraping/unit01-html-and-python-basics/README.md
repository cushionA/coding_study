# unit01: HTMLの構造とPythonの足場

このユニットを終えると、HTML文字列から必要な情報を素朴な文字列処理で拾い出し、
リストと辞書で整形できるようになる。これはBeautifulSoupを使う次ユニット以降の全ての土台になる。

## なぜ学ぶか

スクレイピングの本体は「取得(HTTP)→解析(HTML→データ)→整形(list/dict)→出力(CSV等)」という
一本のパイプラインで、unit02以降で扱うのは主に「解析」をライブラリに任せる方法だ。
だがライブラリの中身は結局のところ文字列処理であり、壊れたHTMLやライブラリが使えない環境に
遭遇したとき素の文字列操作に戻れるかどうかが実務では差になる。ここではその素の力と、
Pythonでデータを扱う共通言語であるリスト内包表記・辞書操作を先に固めておく。

## 概念: PythonとC#の対応

- Pythonの文字列は `.strip()` / `.split()` / f-string など、C#の `Trim()` / `Split()` / `$"..."` に
  ほぼそのまま対応するメソッド・構文を持つ。ただし `str.split(sep, maxsplit)` のように
  分割回数を第2引数で制限できる点はC#の `Split(sep, count)` と引数の意味が異なるので注意。
- リスト内包表記 `[式 for x in xs if 条件]` は、C#のLINQ `xs.Where(...).Select(...)` を
  1つの式にまとめたもの。ループもラムダも書かずに「変換+絞り込み」ができる。
- Pythonの `dict` はC#の `Dictionary<K, V>` に相当する。`d.get(key, デフォルト値)` は
  C#の `TryGetValue` 相当だが、値を取り出しつつデフォルトも指定できるぶん簡潔に書ける。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_string_extract | strip/split/replace/f-stringの基本 | 10分 |
| ex02_list_dict | リスト内包表記と辞書での集計 | 10分 |
| ex03_html_skim | 素朴な文字列処理でHTMLからテキスト・リンクを拾う | 15分 |
| ex04_capstone | プロフィールHTMLの解析→辞書化→整形の一気通貫 | 15分 |

進め方: `ex01_string_extract.py` を開き、TODO を埋めて
`python -m pytest courses/web-scraping/unit01-html-and-python-basics/tests/test_ex01.py -q`
が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] 文字列の前後空白除去・分割・f-stringでの組み立てができる
- [ ] リスト内包表記で「変換+条件抽出」を1行で書ける
- [ ] 辞書を使って出現回数などの集計ができる
- [ ] HTML文字列からタグに挟まれたテキストやリンクURLを取り出せる(壊れやすさも体感する)
