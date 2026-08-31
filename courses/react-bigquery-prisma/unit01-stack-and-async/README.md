# unit01: スタックの全体像と非同期TypeScript

このユニットを終えると、React⇄バックエンドAPI⇄DB群という3層構成のどこに
何を置くべきかを図で説明でき、`async`/`await` で非同期処理を正しく書き、
`fetch` の結果を型に落とし込み、秘密情報を `.env` から安全に読めるようになる。
これはこのコースで作る全アプリの土台になる。

## なぜ学ぶか

実務で「外部APIから取得したデータをDBに保存してブラウザに表示する」を任され
たとき、最初につまずくのは技術の細部ではなく**境界線の引き方**だ。DBの接続
情報やAPIキーをうっかりブラウザ向けのコードに書いてしまうと、その時点で
全世界に鍵を公開したのと同じことになる。このユニットではまずアーキテクチャ
図を自分で描いて境界を体に叩き込み、そのうえで非同期処理(`fetch`は必ず
`await`が要る)と環境変数の安全な扱いという、以降すべてのユニットで前提に
なる基礎を固める。

## 概念: TypeScriptとC#の対応

- **3層構成**: `React(ブラウザ) → Express(バックエンドAPI) → Prisma/BigQuery(データストア)`。
  ブラウザから直接DBやBigQueryを叩く矢印は**禁止**。C#で言えば、WPFアプリから
  直接SQL Serverの接続文字列を埋め込むのが危険なのと同じ理由(鍵は常にサーバ側)。
- **Promise と async/await**: `Promise<T>` はC#の `Task<T>` にほぼ対応する
  「まだ終わっていない処理の未来の結果」。`await` キーワードはC#と綴りも意味も
  同じ。**await を付け忘れると、値の代わりにPromiseオブジェクトそのものが
  流れてしまう**典型バグがあるので要注意(C#で `await` を忘れて `Task` を
  そのまま使ってしまうバグと同じ現象)。
- **Response モデル**: `fetch(url)` はC#の `HttpClient.GetAsync` に相当し、
  戻り値の `Response` は `HttpResponseMessage` に相当する。`response.ok` /
  `response.status` で成否を判定してから `await response.json()` で中身を
  取り出す。json() の戻り値はコンパイル時には `any` なので、自分で定義した
  型に当てはめて初めて安全に使える。
- **環境変数**: `process.env[key]` の型は `string | undefined`。C#の
  `ConfigurationManager` も似た曖昧さはあるが、TypeScriptはコンパイラが
  「undefinedかもしれない」を強制的に意識させてくる。`??`(C#と同じ
  Null合体演算子)でデフォルト値にフォールバックするか、必須の秘密情報
  なら即座にエラーにするか、を使い分ける。

## 進め方

`ex01_promise_basics.ts` から順に開き、TODO を埋めて

```
npx vitest run unit01-stack-and-async/tests/ex01.test.ts
```

(cwdは `courses/react-bigquery-prisma/`)が通れば次へ。詰まったら
`hints/exNN.md` を tier1 から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_promise_basics | Promise/async/awaitの基本、逐次実行と並行実行(Promise.all) | 15分 |
| ex02_typed_fetch | fetchのResponseをok/statusで判定し、json()を型に落とし込む | 15分 |
| ex03_env_config | process.envの安全な読み取り(デフォルト値/必須値/数値変換) | 10分 |
| ex04_capstone | ex01〜ex03を組み合わせた設定読み込み+並行フェッチ関数 | 15分 |

外部APIへの実際の通信は行わない。`ex02`以降は fetch 互換の関数を引数で
受け取る設計(依存性注入)にし、テストではダミーの `Response` を渡す。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] React / Express / Prisma+SQLite / BigQuery の4者が何を担当し、どの矢印が
      許され、どの矢印が禁止かを図に描いて説明できる
- [ ] Promise と async/await を C# の Task<T>/await と対応づけて説明でき、
      await 付け忘れバグを自力で見つけられる
- [ ] fetch の戻り値 Response から ok / status を判定し、await response.json()
      の結果を自分で定義した型に落とし込める
- [ ] 秘密情報を .env + process.env で読み、string|undefined を安全に扱い、
      なぜフロントエンドに置いてはいけないかを説明できる
