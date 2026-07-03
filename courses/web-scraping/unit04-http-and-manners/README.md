# unit04: HTTP通信とスクレイピングのマナー

このユニットを終えると、requestsのレスポンスモデルを理解し、robots.txtを尊重して
レート制限や429に礼儀正しく対応するスクレイパーの土台が書けるようになる。
これは実サイトに接続するunit06キャップストーンの前提知識になる。

## なぜ学ぶか

実務でスクレイパーを書くとき、技術的にデータを取れることと、取ってよいことは別問題だ。
robots.txtを無視したり、間隔を空けずに大量リクエストを送ったりすれば、IPブロック・法的リスク・
最悪は相手のサーバーへの実害につながる。逆に言えば、robots.txtの確認・適切なUser-Agentの
名乗り・Crawl-delayの順守・429への正しい対応さえ押さえれば、多くの現場で「信頼できる書き方」
として評価される。ここではネットワークに実際に繋がず、その判断ロジックだけを先に固める。

## 概念: requestsとC#のHttpClientの対応

- `requests.get(url)` が返す `Response` は、C#の `HttpClient.GetAsync()` が返す
  `HttpResponseMessage` に相当する。`status_code`(StatusCode)・`text`(Contentの文字列)・
  `headers`(Headers、辞書のようにキーでアクセス)・`ok`(IsSuccessStatusCode)を持つ。
- `response.raise_for_status()` は `EnsureSuccessStatusCode()` 相当で、失敗時に例外を投げる。
- `urllib.robotparser.RobotFileParser` はrobots.txtをパースして `can_fetch(user_agent, path)`
  で許可判定できる、標準ライブラリ内蔵のルールエンジン。

## 進め方

`ex01_parse_response.py` を開き、TODO を埋めて
`python -m pytest courses/web-scraping/unit04-http-and-manners/tests/test_ex01.py -q`
が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

すべての演習はネットワークを使わない。`requests.get()` の代わりに `data/fake_responses.py`
のダミーResponse(本物と同じ属性を持つ)を使い、robots.txtも `data/example_robots.txt` を
ローカルファイルとして読み込む。`time.sleep()` も直接呼ばず、待つ処理を関数として注入する
(テストでは実際に待たず「何秒待とうとしたか」だけを記録する)。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_parse_response | Responseのstatus_code/text/headers/okを扱う | 10分 |
| ex02_robots_check | RobotFileParserでrobots.txtの許可判定・Crawl-delay取得 | 15分 |
| ex03_rate_limit | sleep関数を注入したレート制限と429+Retry-Afterの処理 | 15分 |
| ex04_capstone | robots.txt確認→取得→429リトライを一気通貫で組む | 15分 |

## マイルストーン(全部チェックできたらユニット完了)

- [ ] Responseのstatus_code/text/headers/okの役割を説明できる
- [ ] robots.txtをRobotFileParserでパースし、User-Agent別の許可判定ができる
- [ ] Crawl-delayを尊重するレート制限の仕組みをsleep関数の注入で実装できる
- [ ] 429応答をRetry-Afterに従って正しくリトライできる
