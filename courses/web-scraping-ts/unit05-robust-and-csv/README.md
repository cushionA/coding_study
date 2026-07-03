# unit05: 堅牢化とCSV出力

このユニットを終えると、実データの汚れに耐えるクレンジング処理と、失敗に強い
リトライ、そして標準機能だけで書くCSVライタが一人で書けるようになる。
これでスクレイパーは「ローカルの綺麗なフィクスチャでしか動かないコード」から
「実運用に耐えるコード」へ一段階近づく。

## なぜ学ぶか

実在のWebページから取れる値は "¥1,200" "3,600円" "　全角空白付き　" のように
表記が揺れていて、そのままではNumber化に失敗したり集計が狂ったりする。
また通信やパース処理は一時的に失敗することが日常茶飯事で、1回失敗しただけで
処理全体を諦めるのは実務では許されない。最後にCSV出力は一見単純だが、
値にカンマや改行やダブルクォートが混ざった瞬間に自前実装が試される場面になる。
C#で言えば CsvHelper や Polly が裏でやっていることを、標準機能だけで
自分の手で組み立てるのがこのユニットの目的だ。

## 概念: TypeScriptとC#の対応

- TypeScriptの `Number(s)` はC#の `int.TryParse` と似て例外を投げないが、
  失敗すると `NaN`(Not a Number)という特殊な数値を返す。`NaN === NaN` は
  `false` になるため、判定には専用の `Number.isNaN(x)`(C#の `double.IsNaN(x)`)
  を使う必要がある。空文字を渡すと `NaN` ではなく `0` になる罠もあるので、
  自分で空文字ガードを書く。
- リトライは C# の Polly の `Retry().WaitAndRetryAsync(...)` に相当する処理を
  `for` ループ + `try/catch` + `await` で自作する。指数バックオフ(待ち時間を
  倍々に増やす)にジッタ(ランダムなブレ)を足すことで、複数クライアントの
  再試行が同時に集中する事故を防ぐ。
- CSVは C# の `CsvHelper` が内部でやっているエスケープ規則(カンマ・改行・
  ダブルクォートを含む値をダブルクォートで囲み、内部の `"` は `""` にする)を
  自分の手で実装する。`fs.writeFileSync(path, text, "utf-8")` はC#の
  `File.WriteAllText(path, text, Encoding.UTF8)` に相当する。

## 進め方

まず `lesson/` の概念スクリプトを番号順に読み、実行しながら手を動かす(cwd は `courses/web-scraping-ts/`):

```
npx tsx unit05-robust-and-csv/lesson/01_data_cleaning.ts
npx tsx unit05-robust-and-csv/lesson/02_retry_backoff.ts
npx tsx unit05-robust-and-csv/lesson/03_csv_escaping.ts
npx tsx unit05-robust-and-csv/lesson/04_pipeline_validation.ts
```

各ファイルの「見る」→「予測してみよう」→「変えてみる」を実行で確認し、最後の
「書いてみる」ブロックの `// ここに書く` に自分で書いて再実行 → チェックが `[OK]` に
なれば次のファイルへ。4本すべて終えたら演習に進む。

そのうえで `ex01_clean_fields.ts` を開き、TODO を埋めて

```
npx vitest run unit05-robust-and-csv/tests/ex01.test.ts
```

(cwdは `courses/web-scraping-ts/`)が通れば次へ。詰まったら `hints/exNN.md` を tier1 から順に読む。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_clean_fields | 空白正規化・通貨表記/カンマ除去・数値化・日付正規化 | 12分 |
| ex02_error_handling | try/catchでのスキップ処理と指数バックオフ+ジッタのリトライ | 15分 |
| ex03_write_csv | CSVエスケープの自作とfs.writeFileSyncでのファイル出力 | 12分 |
| ex04_capstone | dirty_records.htmlからクレンジング→スキップ→CSV出力までの一気通貫 | 15分 |

## マイルストーン(全部チェックできたらユニット完了)

- [ ] `Number()` と `NaN` の落とし穴(空文字が0になる・`NaN === NaN` がfalse)を説明できる
- [ ] 指数バックオフとジッタをそれぞれ自分の言葉で説明できる
- [ ] CSVのエスケープ規則(いつダブルクォートで囲むか・`"` をどう二重化するか)を書ける
- [ ] cheerioで抽出した汚いレコードを、クレンジング→検証スキップ→CSV出力まで一人で通せる
