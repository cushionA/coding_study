# 2026-08-01 web-scraping-ts: 配列操作と非同期処理

## 今日できたこと

- `map` / `filter` / `find` を C# の `Select` / `Where` / `FirstOrDefault` と対応づけた。
- スクレイピングでは配列の値を扱う `for...of` を使い、`for...in` は添字やオブジェクトのキーを扱う。
- `await` はその `async` 関数の続きだけを待機させ、イベントループは塞がない。

## 注意点

- `find` が見つけられない場合の値は `null` ではなく `undefined`。`??` で既定値を指定できる。
- 毎フレーム呼ばれる処理から非同期通信を開始するなら、`Loading` / `Loaded` などの状態で重複実行を防ぐ。
- HTTP 429 では `Retry-After` を優先し、即時再試行はしない。

## 次回

- unit01 のレッスン04で `Record<string, T>` を復習する。
