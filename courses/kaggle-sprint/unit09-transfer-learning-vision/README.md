# unit09: 転移学習で画像分類

このユニットを終えると、画像Dataset/DataLoaderの契約を実装し、backboneを凍結してheadを差し替え、混同行列とTTAを含む評価を回せる。

## なぜ学ぶか

少量データでは、汎用特徴を学んだbackboneを再利用する転移学習が精度と計算費の両方で有利になりやすい。ただしtransformの混線、HWC/CHW、凍結漏れ、optimizerへ不要パラメータを渡すバグが頻発する。学習対象数とbatch shapeを毎回検算するのが実務の型になる。

DatasetはC#の `IReadOnlyList<(Image,Label)>`、DataLoaderはbatchを返す `IEnumerable<T[]>` と捉えられる。transformはコンストラクタ注入でtrain/validを差し替える。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_dataset_dataloader | PyTorch Dataset・DataLoader・BCHW | 20分 |
| ex02_freeze_and_swap_head | ResNet18の凍結・head交換・段階解凍 | 15分 |
| ex03_train_and_confusion | 実学習ループ・推論・混同行列 | 15分 |
| ex04_capstone | 転移戦略と解像度別メモリを判断 | 20分 |

## マイルストーン

- [ ] train/validでtransformを分離できる
- [ ] 学習対象パラメータ数を検算できる
- [ ] accuracyだけでなくクラス別誤りを読める
- [ ] 凍結・全層・段階解凍を根拠つきで選べる
