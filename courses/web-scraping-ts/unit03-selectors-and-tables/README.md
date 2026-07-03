# unit03: セレクタと表・リストの抽出

このユニットを終えると、CSSセレクタを組み合わせて複数レコードを一括抽出し、
table要素を`Array<Record<string, string>>`に変換し、欠損やclass揺れのある
実データに対して防御的にアクセスできるようになる。unit02の「1件のタグから
1つの値を取る」から、「たくさんの似た要素からレコードの配列を作る」への
橋渡しがこのユニットの核心。

## なぜ学ぶか

実務のスクレイピング対象は、商品一覧・記事一覧・統計テーブルのように
「似た構造の要素が何十件も並ぶ」形がほとんどだ。unit02までの`$("h1")`のような
単純なセレクタでは足りず、class・親子関係・属性を組み合わせて狙った要素の
集合だけを選び出す必要がある。さらに実データはtable形式だったり、
一部の要素が欠けていたり、class名が揺れていたりする。ここで雑に`.text()`を
呼ぶだけのコードは、欠損に出会った瞬間にバグを起こす。防御的アクセスの型を
身につけることが、unit05のCSV出力を壊さないための土台になる。

## 概念: TypeScriptとC#の対応

- CSSセレクタ(`div.item > span`、`[data-stock="in"]`、カンマ区切りのOR)は
  C#に直接対応する構文が無い、cheerio(≒jQuery)固有の新しい書き方として覚える。
  発想としてはLINQ to XMLの絞り込みクエリに近い。
- tableの `thead th` → 見出し、`tbody tr` → 各行、行ごとに `find("td")` で
  セルを取る、という定型パターンは、C#の`DataTable`を`List<Dictionary<string,string>>`
  に変換する処理と同じ形をしている。
- cheerioで要素が「見つからない」場合は例外にならず、長さ0の集合が返る
  (C#の`FirstOrDefault`が`null`を返すのに近いが、TSでは`.length === 0`で判定する)。
  `.attr()`が返す`string | undefined`は、C#の`??`と同じ記号の`??`でデフォルト値と
  組み合わせるのが定石。
- class揺れ(`event` / `event-item`)には、セレクタのカンマ区切り
  (`"li.event, li.event-item"`)でOR条件として一括対応する。

## 進め方

まず `lesson/` の概念スクリプトを番号順に読み、実行しながら手を動かす(cwd は `courses/web-scraping-ts/`):

```
npx tsx unit03-selectors-and-tables/lesson/01_css_selectors.ts
npx tsx unit03-selectors-and-tables/lesson/02_table_extraction.ts
npx tsx unit03-selectors-and-tables/lesson/03_records_and_defensive_access.ts
```

各ファイルの「見る」→「予測してみよう」→「変えてみる」を実行で確認し、最後の
「書いてみる」ブロックの `// ここに書く` に自分で書いて再実行 → チェックが `[OK]` に
なれば次のファイルへ。3本すべて終えたら演習に進む。

そのうえで `ex01_css_select.ts` を開き、TODO を埋めて

```
npx vitest run unit03-selectors-and-tables/tests/ex01.test.ts
```

(cwdは `courses/web-scraping-ts/`)が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_css_select | class・子供結合子・属性セレクタで複数レコードを一括抽出 | 12分 |
| ex02_table_parse | table(thead/tbody)をArray<Record<string,string>>に変換 | 15分 |
| ex03_records_cleanup | 欠損要素・class揺れへの防御的アクセス(length===0・??） | 15分 |
| ex04_capstone | 商品カードの抽出→整形→集計の一気通貫 | 13分 |

## マイルストーン(全部チェックできたらユニット完了)

- [ ] class・子供結合子(`>`)・属性セレクタを組み合わせて複数要素を一括抽出できる
- [ ] tableのthead/tbodyから見出しと行データを取り出し、Array<Record<string,string>>に変換できる
- [ ] `.length === 0` で「要素が存在しない」ことを判定し、フォールバック値で埋められる
- [ ] class名が揺れているHTMLでもカンマ区切りセレクタで漏れなく拾える
