# 2026-08-02 web-scraping-ts: Cheerio 基本API

## Cheerioは何をするものか

CheerioはHTML文字列を解析し、CSSセレクタで要素を探せるようにするNode.jsライブラリ。ブラウザのDOMを操作するjQueryに近いAPIだが、ブラウザを起動したりページ内のJavaScriptを実行したりはしない。

```ts
import * as cheerio from "cheerio";

const $ = cheerio.load(html);
```

`cheerio.load(html)` は検索関数 `$` を作る。`$(".title")` のようにCSSセレクタを渡して要素を選ぶ。

## 選択結果: `Cheerio<Element>`

`$(selector)` の戻り値は、0件以上のHTML要素を包んだ `Cheerio<Element>`。配列そのものではないが、選択・探索・反復を続けてつなげられる。C#なら `IEnumerable<HtmlElement>` にDOM操作を生やしたものに近い。

```ts
const cards = $(".card");
const firstTitle = cards.find(".title").first().text();
```

## 抽出

| 用途 | API | 戻り値と注意 |
|---|---|---|
| 表示テキスト | `.text()` | `string`。複数要素なら連結され、0件なら `""` |
| 属性値 | `.attr("href")` | 先頭要素の属性を読む。`string \| undefined` |
| 内側のHTML | `.html()` | `string \| null` |
| 要素数 | `.length` | `number` |

```ts
const title = $(".post-title").text().trim();
const href = $("a").attr("href") ?? null;
```

`href` はリンク先を表す属性。`/books` のような相対URL、`https:` / `mailto:` / `tel:` などのURLスキームを持つ値が入る。スクレイパーが巡回するのは通常 `http:` / `https:` だけに絞る。

## 探索・移動

| 用途 | API |
|---|---|
| 選択要素の子孫を探す | `.find(".title")` |
| 直接の子を取る | `.children("li")` |
| 直接の親を取る | `.parent()` |
| 条件に合う最も近い祖先を取る | `.closest(".card")` |
| 条件で絞る | `.filter(".featured")` |
| 先頭・末尾・指定位置を取る | `.first()` / `.last()` / `.eq(index)` |

これらの多くは再び `Cheerio<Element>` を返す。複数要素に `.parent()` を呼ぶと、それぞれの直親を集めた集合になり、同じ親は重複しない。

```ts
const href = $(".card")
  .first()
  .find("a")
  .attr("href");
```

`.eq(0)` は先頭、`.eq(-1)` は末尾を選ぶ。範囲外なら空のCheerio集合になる。

## 複数要素を処理する `.each()`

`.each()` は変換結果を作るより、各要素に対する手続きを書くためのAPI。

```ts
const hrefs: string[] = [];

$("a").each((index, element) => {
  const href = $(element).attr("href");
  if (href) hrefs.push(href);
});
```

- コールバック引数は `(index, element)`。`index` が不要でも第2引数を使うなら `(_, element)` と書く。
- `element` は素のDOM要素なので、`.text()` や `.attr()` を使うときは `$(element)` でCheerioとして包み直す。
- `.each()` 自体は元のCheerio集合を返す。jQuery由来のメソッドチェーンのため。
- コールバックで `false` を返すと、反復を途中で止められる。

通常の配列APIを使いたいなら `.toArray()` でHTML要素配列へ変換してから `map` / `filter` を使う。

## 編集

読み込んだHTMLはメモリ上で編集できる。

```ts
$("a").each((_, element) => {
  $(element).attr("data-checked", "true").addClass("checked");
});

const editedHtml = $.html();
```

`attr(name, value)`、`text(value)`、`addClass()`、`remove()`、`append()` などが使える。ただし元サイトやブラウザ上のページが変更されるわけではなく、取得済みHTMLのコピーだけが変わる。

## 基本の流れ

```text
HTML文字列
  → cheerio.load(html)
  → $(CSSセレクタ) で対象集合を選ぶ
  → text / attr で値を抽出する
  → 必要なら each で配列・Recordへ整形する
```
