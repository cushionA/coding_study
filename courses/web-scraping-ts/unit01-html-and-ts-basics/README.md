# unit01: HTMLの構造とTypeScriptの足場

このユニットを終えると、HTML文字列から必要な情報を素朴な文字列処理で拾い出し、
配列とオブジェクト(Record)で整形できるようになる。これはcheerioを使う次ユニット以降の
全ての土台になる。

## なぜ学ぶか

スクレイピングの本体は「取得(HTTP)→解析(HTML→データ)→整形(配列/オブジェクト)→出力(CSV等)」
という一本のパイプラインで、unit02以降で扱うのは主に「解析」をcheerioに任せる方法だ。
だがライブラリの中身は結局のところ文字列処理であり、壊れたHTMLやライブラリが使えない環境に
遭遇したとき素の文字列操作に戻れるかどうかが実務では差になる。ここではその素の力と、
TypeScriptでデータを扱う共通言語である配列メソッド・Record<K, V>操作を先に固めておく。

## 概念: TypeScriptとC#の対応

- TypeScriptの文字列は `.trim()` / `.split()` / テンプレートリテラル `` `${...}` `` など、
  C#の `Trim()` / `Split()` / `$"..."` にほぼそのまま対応するメソッド・構文を持つ。
  ただし `.split(",")` は常に全区切りで分割される点はC#の `Split(sep, count)` のように
  分割回数を制限できないので、「最初の1個だけで区切りたい」場合は一工夫が要る。
- 配列の `.filter().map()` は、C#のLINQ `.Where(...).Select(...)` にそのまま対応する。
  ループもラムダ式風のアロー関数 `(x) => ...` で「変換+絞り込み」ができる。
- TypeScriptの `Record<string, number>` はC#の `Dictionary<string, int>` に相当する。
  存在しないキーへのアクセスは例外にならず `undefined` になるため、`??`(Null合体演算子。
  C#の `??` と同じ意味・同じ記号)でデフォルト値と組み合わせるのが定石。
- `extractBetween` のように「見つからない場合がある」関数の戻り値型は `string | null` の
  ような合併型(union type)で表現する。C#の `string?`(nullable)に近い発想だが、TSでは
  戻り値の型注釈に明示的に書く必要がある。

## 進め方

まず `lesson/` の概念スクリプトを番号順に読み、実行しながら手を動かす(cwd は `courses/web-scraping-ts/`):

```
npx tsx unit01-html-and-ts-basics/lesson/01_pipeline_and_dom.ts
npx tsx unit01-html-and-ts-basics/lesson/02_string_ops.ts
npx tsx unit01-html-and-ts-basics/lesson/03_array_methods.ts
npx tsx unit01-html-and-ts-basics/lesson/04_object_record.ts
```

各ファイルの「見る」→「予測してみよう」→「変えてみる」を実行で確認し、最後の
「書いてみる」ブロックの `// ここに書く` に自分で書いて再実行 → チェックが `[OK]` に
なれば次のファイルへ。4本すべて終えたら演習に進む。

そのうえで `ex01_string_extract.ts` を開き、TODO を埋めて

```
npx vitest run unit01-html-and-ts-basics/tests/ex01.test.ts
```

(cwdは `courses/web-scraping-ts/`)が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_string_extract | trim/split/replace/テンプレートリテラルの基本 | 10分 |
| ex02_array_record | 配列メソッド(filter/map)とRecord<K, V>での集計 | 10分 |
| ex03_html_skim | 素朴な文字列処理でHTMLからテキスト・リンクを拾う | 15分 |
| ex04_capstone | プロフィールHTMLの解析→オブジェクト化→整形の一気通貫 | 15分 |

## マイルストーン(全部チェックできたらユニット完了)

- [ ] 文字列の前後空白除去・分割・テンプレートリテラルでの組み立てができる
- [ ] `.filter().map()` で「変換+条件抽出」を1行で書ける
- [ ] `Record<string, number>` を使って出現回数などの集計ができる
- [ ] HTML文字列からタグに挟まれたテキストやリンクURLを取り出せる(壊れやすさも体感する)
