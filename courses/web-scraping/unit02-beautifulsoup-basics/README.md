# unit02: BeautifulSoupで解析する

このユニットを終えると、BeautifulSoupでHTMLをタグのツリーとして読み込み、
find/find_allでタグを探し、テキストや属性を取り出せるようになる。

## なぜ学ぶか

unit01では `.find()` や `.split()` でHTMLを素朴な文字列として扱ったが、タグの
入れ子が深くなったり属性の順序が変わったりすると簡単に壊れた。実務のスクレイパーは
ほぼ例外なくHTMLパーサ(BeautifulSoup・lxml等)を使う。パーサはHTMLを構文解析して
オブジェクトのツリーにしてくれるので、「このクラスを持つdivの中のaタグ」のような
構造ベースの検索が安全にでき、コードも短くなる。

## 概念: BeautifulSoupとC#の対応

- `BeautifulSoup(html, "html.parser")` はHTML文字列をパースしてツリー構造にする。
  C#で `XDocument.Parse(xml)` してオブジェクトツリーを得るのと同じ発想。
- `soup.find_all("a", class_="external")` はC#のLINQ `Where(x => x.Name == "a" && ...).ToList()`
  に近い。`find()` は最初の1件だけを返す `FirstOrDefault()` に近い。
- タグの属性アクセス `tag["href"]` はC#の `Dictionary<string,string>` のインデクサに近い。
  存在しない属性を安全に扱うには `.get("href")` (辞書の `TryGetValue` 相当)を使う。
- `.find_next_sibling()` や `.parent` はツリー上のノードを親子・兄弟方向に辿る。
  C#のDOM操作(`XElement.Parent`, `XElement.NextNode`)と同じ考え方。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_find_basic | find()でタグ1件を探し、テキスト・タグ名を取得 | 10分 |
| ex02_findall_loop | find_all()で複数タグを一括収集、classで絞り込み | 15分 |
| ex03_attributes | 属性アクセスと親子・兄弟ナビゲーション | 15分 |
| ex04_capstone | ブログ記事の辞書化とフロア別座席数の集計 | 15分 |

進め方: `ex01_find_basic.py` を開き、TODO を埋めて
`python -m pytest courses/web-scraping/unit02-beautifulsoup-basics/tests/test_ex01.py -q`
が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] HTML文字列をBeautifulSoupオブジェクトとしてパースできる
- [ ] find()とfind_all()の違い(1件 vs 全件)を説明できる
- [ ] タグのテキストと属性値をそれぞれ正しく取り出せる
- [ ] class名での絞り込みと、親子・兄弟方向のナビゲーションができる
