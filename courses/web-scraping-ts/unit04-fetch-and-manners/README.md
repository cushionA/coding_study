# unit04: fetch通信とスクレイピングのマナー

このユニットを終えると、fetchのレスポンスモデルを理解し、robots.txtを尊重して
レート制限や429に礼儀正しく対応するスクレイパーの土台が書けるようになる。
これは実サイトに接続するunit06キャップストーンの前提知識になる。

## なぜ学ぶか

実務でスクレイパーを書くとき、技術的にデータを取れることと、取ってよいことは別問題だ。
robots.txtを無視したり、間隔を空けずに大量リクエストを送ったりすれば、IPブロック・法的リスク・
最悪は相手のサーバーへの実害につながる。逆に言えば、robots.txtの確認・適切なUser-Agentの
名乗り・Crawl-delayの順守・429への正しい対応さえ押さえれば、多くの現場で「信頼できる書き方」
として評価される。ここではネットワークに実際に繋がず、その判断ロジックだけを先に固める。

## 概念: fetchとC#のHttpClientの対応

- `fetch(url)` が返す `Response` は、C#の `HttpClient.GetAsync()` が返す
  `HttpResponseMessage` に相当する。`status`(StatusCode)・`ok`(IsSuccessStatusCode)・
  `headers.get(name)`(Headers、TryGetValueに近いが無ければ `null` を返す)・
  `text()`(Content文字列、C#の `ReadAsStringAsync()` と同じく非同期で `Promise<string>`)を持つ。
- fetchはPromiseベースなので、`await fetch(url)` や `await response.text()` のように
  `async`関数の中で使う。C#の `async Task<string>` メソッドで `await` するのと同じ発想。
- タイムアウトはC#では `CancellationTokenSource` を渡すが、fetchでは `AbortController` を
  使う(このユニットではネットワークを使わないため深追いしないが、概念だけ押さえる)。
- Node.js標準ライブラリにはPythonの `urllib.robotparser` に相当するrobots.txtパーサが
  無いため、**ex02では自分でミニパーサを書く**。行志向のシンプルな仕様に絞ることで、
  「Disallow/Allowの前方一致判定」というrobots.txtの本質的なロジックを体験する。

## 進め方

`ex01_handle_response.ts` を開き、TODO を埋めて

```
npx vitest run unit04-fetch-and-manners/tests/ex01.test.ts
```

(cwdは `courses/web-scraping-ts/`)が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

すべての演習はネットワークを使わない。`fetch()` の代わりに `data/fakeResponses.ts` の
ダミーResponse(Web標準の `Response` と同じ `ok`/`status`/`headers.get()`/`text()` を持つ)を使い、
robots.txtも `data/example_robots.txt` をローカルファイルとして読み込む。`setTimeout` も
直接呼ばず、待つ処理を関数として注入する(テストでは実際に待たず「何秒待とうとしたか」だけを
記録する)。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_handle_response | Responseのstatus/text()/headers/okをasync/awaitで扱う | 10分 |
| ex02_robots_parser | robots.txtの自前ミニパーサ(User-agent別Disallow/Crawl-delay) | 20分 |
| ex03_rate_limit | sleep関数を注入したレート制限と429+Retry-Afterの処理 | 15分 |
| ex04_capstone | robots.txt確認→取得→429リトライを一気通貫で組む | 10分 |

## 倫理: スクレイパーが最低限守るべきこと

- **robots.txtを確認する**: 法的拘束力は無くとも、サイト運営者の意思表示として尊重する。
  `Disallow` されたパスは巡回しない。
- **正直なUser-Agentを名乗る**: ブラウザのふりをして偽装するのではなく、自分のBot名と
  できれば連絡先を示す(例: `MyScraperBot/1.0 (+contact@example.com)`)。相手が問題を
  検知したときに連絡を取れるようにしておくことが信頼につながる。
- **Crawl-delayを守る**: サーバーへの負荷を抑えるため、指定された間隔(無指定でも
  常識的な間隔)を空けてリクエストする。
- **429には従う**: `Retry-After` ヘッダで指定された秒数を待ってから再試行する。無視して
  連打するのは最も避けるべき挙動。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] Responseのstatus/text()/headers/okの役割をasync/awaitで説明できる
- [ ] robots.txtをUser-agent別にパースし、Disallow/Allowの前方一致で許可判定ができる
- [ ] Crawl-delayを尊重するレート制限の仕組みをsleep関数の注入で実装できる
- [ ] 429応答をRetry-Afterに従って正しくリトライできる
