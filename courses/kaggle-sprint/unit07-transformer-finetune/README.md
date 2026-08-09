# unit07: Transformerのファインチューニング

このユニットを終えると、サブワードID列を動的paddingし、attention mask・学習率schedule・early stoppingを含む学習ループの部品を組める。

## なぜ学ぶか

実務でTransformerを使うとき、モデル呼び出しよりもtokenizer、batch化、mask、学習率、過学習監視のバグが結果とコストを左右する。事前学習済み重みを使う前に、小さな配列でshapeと更新順を検証できればGPU時間を無駄にしない。

tokenizerの返すdictはC#のDTO、collateは可変長の `IEnumerable<int[]>` を固定shapeのbatchへ組み立てるアダプタに近い。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_subword_tokenizer | BPE風mergeと特殊token付きID化 | 20分 |
| ex02_collate_and_mask | 動的paddingとattention bias | 15分 |
| ex03_lr_schedule | warmup + linear decay | 15分 |
| ex04_capstone | 極小BERTの実forward・fine-tuning・推論 | 20分 |

## マイルストーン

- [ ] 未知語をsubwordへ分けID列にできる
- [ ] `(batch, seq)` maskをattention用shapeへ変換できる
- [ ] optimizer step単位のscheduleを計算できる
- [ ] 実BERTでlossを逆伝播し最良重みを復元できる
