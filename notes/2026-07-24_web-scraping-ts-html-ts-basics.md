# 2026-07-24 web-scraping-ts: HTML と TypeScript の基礎

## 今日できるようになったこと (Can-Do)

- HTML のタグ、`id`、`class` の役割を区別できる。
- CSS セレクタの `#id`、`.class`、`tag` が指す対象を説明できる。
- TypeScript を `tsx`、`tsc`、`ts-node` で実行・変換する流れを説明できる。

## HTML の基本

### タグ・id・class

```html
<article id="featured-article" class="article featured">
  記事本文
</article>
```

- `article` は HTML の標準タグ。独立した記事・投稿を表す。
- `id="featured-article"` は開発者が付ける一意の名前。同じページ内で原則1つだけ。
- `class="article featured"` は開発者が付ける分類ラベル。同じクラスを複数の要素に付けられ、1要素に複数のクラスも付けられる。

`<main id="article">` の `article` は id の値であり、`<article>` タグとは別物。名前が同じでも、前者は識別名、後者はHTMLの要素名である。

### よく使う構造タグ

- `<head>`: ページ設定やタイトルなど。通常は画面に表示されない。
- `<header>`: ページ・記事・セクションの先頭部分。ページ内に複数あってよい。
- `<main>`: ページの主な内容。通常はページに1つ。
- `<p>`: 段落。
- `<article>`: 独立して読める記事・投稿のまとまり。

HTMLは親子関係を持つツリー構造（DOM）。C#のオブジェクトが子オブジェクトを持つオブジェクトグラフに近い。

### `a` タグと `href` 属性

```html
<a href="/books">蔵書一覧</a>
```

- `a` はリンクを表すタグ。
- `href` はリンク先を表す属性。`/books` は同じサイト内のルート相対URL。
- `蔵書一覧` は要素のテキスト内容で、`href` 属性とは別物。
- Cheerioの `$("a").attr("href")` は先頭の `a` 要素のリンク先を `string | undefined` として返す。複数リンクは `.each()` で順に扱う。

### `<!...>` とコメント

```html
<!DOCTYPE html>
<!-- ここがコメント -->
```

- `<!DOCTYPE html>` は、現代のHTMLとして扱うようブラウザへ伝える宣言。タグではなく、通常は文書の先頭に1回だけ置く。
- HTMLコメントは `<!--` と `-->` の間に書く。`!` は必須。
- HTMLコメント内では `--` を使わない。

## CSS セレクタ

```css
#article { max-width: 800px; }
article { max-width: 800px; }
.article { max-width: 800px; }
```

- `#article`: `id="article"` の要素1つ。
- `article`: `<article>` タグの全要素。
- `.article`: `class="article"` を持つ全要素。

つまり、タグ・class・id はすべてセレクタで指定できる。対応は `タグ名`、`.クラス名`、`#ID名` の順。

### 指定の使い分けと注意点

- タグ指定（`article`）: 同じタグの全要素が対象。HTML本来の意味に対して共通の見た目を付けるときに向くが、対象が広くなりやすい。
- class指定（`.article`）: 開発者が任意の分類を付け、複数要素へ共通の見た目を付けるときに向く。`class="article featured"` のように空白区切りで複数指定できる。
- id指定（`#article`）: ページ内で一意の特定要素を指定するときに向く。同じ `id` を複数要素へ付けない。

HTMLではタグを `<article>...</article>`、classを `class="article"`、idを `id="article"` の形で書く。CSSではそれぞれ `article`、`.article`、`#article` の形で指定する。

タグ名・class名・id名に同じ文字列を使っても、CSSの記号で区別されるため衝突しない。例えば `<article id="article" class="article">` に対して、`article` はタグ、`.article` はclass、`#article` はidを指す。ただし同じ `id="article"` を複数の要素へ付けることはHTMLの規則に反し、CSSやJavaScript、スクレイピングで意図しない結果を招く。class名の重複は意図した使い方であり、同じclassを複数要素に付けてよい。

タグ・class・id は同じ要素へ併用できる。例えば `article.featured` は `<article>` タグかつ `featured` クラスの要素、`#featured-article .title` は `id="featured-article"` の内部にある `title` クラスの要素を指定する。

同じ要素に複数の指定が当たり、同じプロパティが競合した基本優先度は `ID > class > タグ`。同じ優先度なら後に書かれた規則が優先される。

`!important` は通常の優先順位を強制的に上書きする指定。追跡しづらくなるため、基本的には使わずセレクタを整理して解決する。

## TypeScript の実行

実際にJavaScriptを動かす実行環境は Node.js。TypeScriptはそのままではNode.jsで実行できないため、JavaScriptへの変換が必要になる。

```text
.ts ファイル
  ├─ tsc ──> .js ファイル ──> node ──> 実行
  ├─ ts-node ───────────────> node ──> 実行
  └─ tsx ───────────────────> node ──> 実行
```

- `tsc`: TypeScript Compiler。`.ts` を `.js` に変換する。
- `node`: JavaScriptを実行する本体。
- `ts-node`: TypeScriptをNode.jsで動かす実行ツール。TypeScript公式コンパイラに近い仕組み。
- `tsx`: TypeScript/TSXを高速に変換しながら実行するツール。この教材で使う。
- `npm`: Node Package Manager。パッケージ管理と、`package.json` に登録したスクリプト実行を担当する。
- `npx`: Node Package eXecute。プロジェクトに導入されたコマンドを呼び出す。必要なら一時取得して実行することもある。

教材のlessonは、コース直下で次のように実行する。

```powershell
npx tsx .\unit01-html-and-ts-basics\lesson\01_pipeline_and_dom.ts
```

相対パスの基準は、ターミナルの現在位置。絶対パスは不要。

### ローカル導入と `npx`

`npm install tsx` でプロジェクトに導入した `tsx` は、通常 `node_modules/.bin/tsx` に置かれる。PowerShellはこの場所を自動では探さないため、グローバル導入されていない環境で `tsx lesson.ts` とだけ書くと見つからない。

`npx tsx lesson.ts` は、まずプロジェクトの `node_modules/.bin/tsx` を探し、見つけた既存の `tsx` を実行する。既に導入済みなら再インストールしない。見つからない場合だけ、一時取得して実行できるかを確認する。

```text
npx tsx
  ↓
node_modules/.bin/tsx を探す
  ↓
見つかる     → 既存のtsxを実行
見つからない → 必要に応じて一時取得して実行
```

`npm install -g tsx` のようにグローバル導入すると、PC全体から `tsx lesson.ts` と直接実行できる。`npm run` で `package.json` のscriptsを実行する場合も、npmがプロジェクト内の `node_modules/.bin` を自動で探索する。

## `tsconfig.json` の役割

TypeScriptプロジェクト全体の変換・型チェック設定ファイル。

- 出力するJavaScriptの仕様（`target`）
- `import` / `export` の扱い（`module`）
- 型チェックの厳しさ（`strict`）
- 対象・除外するファイル

C#の `.csproj` における言語設定やNullable設定に近い。ただしパッケージ管理は `package.json`、TypeScriptの設定は `tsconfig.json` に分かれる。

## 次回の開始地点

`unit01-html-and-ts-basics/lesson/01_pipeline_and_dom.ts` の「書いてみる」で、`<a href=` の出現回数を数える `result1` を自力で実装し、`[OK]` を確認する。
