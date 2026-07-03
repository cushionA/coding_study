# unit02: cheerioで解析する

このユニットを終えると、HTML文字列を cheerio でパースし、jQuery風の `$(selector)` で
タグを探索・テキストと属性を取り出し、`.each()` や `.find()` で階層構造を辿れるように
なる。unit01で体感した「素の文字列処理の壊れやすさ」を、パーサに任せることで
解決する回である。

## なぜ学ぶか

unit01では `indexOf` / `slice` でHTMLを手作業で切り出した。タグの改行や属性の
順番が少し変わるだけで壊れる素朴さを体感したはずだ。cheerioはHTMLを「タグの
入れ子構造(DOM)」として正しく読み込み、CSSセレクタで欲しい要素を探せるように
するライブラリで、実務のスクレイパーはほぼ例外なくこれを使う。C#で言えば、
XML文字列を `XDocument.Parse()` でパースしてノードを辿るのに近い感覚だ。

## 概念: TypeScript/cheerioとC#の対応

- `cheerio.load(html)` はHTML文字列をパースし、クエリ関数 `$` を返す。
  C#の `XDocument.Parse()` に相当する「文字列→操作可能なオブジェクト」への変換。
- `$(セレクタ)` はCSSセレクタで要素のコレクションを取得する。C#でXMLを
  XPathで探すのに近いが、記法はCSSセレクタ。`.text()` は**常に string を返す**
  (該当なしでも空文字列で、例外にならない)。
- `.each((index, element) => {...})` は複数要素を1件ずつ処理する。C#の
  `foreach` に相当するが、コールバック内では素のDOM要素しか渡されないため、
  `$(element)` と再び包み直してから `.text()` / `.attr()` を呼ぶ必要がある。
- `.attr("属性名")` は **string | undefined を返す**(`.text()` との違いに注意)。
  属性が無ければ `undefined` になり、これはC#の `Dictionary.TryGetValue()` で
  見つからない場合に近い「見つからないことが型で表現されている」状態。
  `??`(Null合体演算子。C#の `??` と同じ)でデフォルト値にフォールバックするのが定石。
- `.find(selector)` は「その要素の子孫の中だけ」を探す(スコープ付き検索)。
  `.children(selector?)` は直接の子だけ、`.parent()` は直接の親を返す。
  同じクラス名が複数箇所で繰り返されるHTMLでは、外側の要素を `.each()` で
  回してから `.find()` でスコープを絞る、という二重構造が定石になる。

## 進め方

まず `lesson/` の概念スクリプトを番号順に読み、実行しながら手を動かす(cwd は `courses/web-scraping-ts/`):

```
npx tsx unit02-cheerio-basics/lesson/01_cheerio_load.ts
npx tsx unit02-cheerio-basics/lesson/02_each_and_first.ts
npx tsx unit02-cheerio-basics/lesson/03_attributes.ts
npx tsx unit02-cheerio-basics/lesson/04_tree_navigation.ts
```

各ファイルの「見る」→「予測してみよう」→「変えてみる」を実行で確認し、最後の
「書いてみる」ブロックの `// ここに書く` に自分で書いて再実行 → チェックが `[OK]` に
なれば次のファイルへ。4本すべて終えたら演習に進む。

そのうえで `ex01_query_basic.ts` を開き、TODO を埋めて

```
npx vitest run unit02-cheerio-basics/tests/ex01.test.ts
```

(cwdは `courses/web-scraping-ts/`)が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_query_basic | cheerio.load()と$(selector).text()の基本 | 10分 |
| ex02_each_loop | .each()での反復と.first()/.eq()での1件選択 | 15分 |
| ex03_attributes | .attr()の string\|undefined と ?? でのフォールバック | 15分 |
| ex04_capstone | フロア案内HTMLをfind/each入れ子で解析→整形の一気通貫 | 15分 |

## マイルストーン(全部チェックできたらユニット完了)

- [ ] `cheerio.load(html)` で `$` を作り、クラス名セレクタでテキストを取り出せる
- [ ] `.each()` で複数要素を1件ずつ処理し、配列にまとめられる
- [ ] `.attr()` が `string | undefined` を返すことを理解し、`??` で安全に扱える
- [ ] `.find()` で子孫要素だけにスコープを絞った探索ができる(同名クラスの
      繰り返し構造でも、外側の `.each()` と組み合わせて正しく対応づけられる)
