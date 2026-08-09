# unit04: テーブルの特徴量エンジニアリング

このユニットを終えると、カテゴリ・集約・日時の特徴量をリークなく作り、前処理ごとPipelineへ載せられる。

## なぜ学ぶか

表データでは、モデルを替えるより「目的に合う列」を作る方が大きく効くことが多い。一方、全データで統計を作るtarget encodingや、未来を含むlagは検証値を壊す。実務では、特徴量の計算範囲を学習foldへ閉じ込める設計が再現性と安全性を決める。

`groupby().transform()` はC#の `GroupBy` で計算した値を元の各要素へ貼り戻す操作に近い。`Pipeline` は前処理とモデルを一つのコンポーネントへ合成するデコレータ／ミドルウェアのように扱える。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_categorical_encoding | 未知カテゴリに耐えるfrequency/one-hot | 15分 |
| ex02_oof_target_encoding | fold内だけでtarget encoding | 20分 |
| ex03_groupby_and_datetime | 群内相対値・周期・lag | 20分 |
| ex04_capstone | 前処理とモデルをPipeline化してOOF | 20分 |

`lesson.ipynb` の後、ex01から進める。例: `python -m pytest courses/kaggle-sprint/unit04-tabular-feature-engineering/tests/test_ex01.py -q`。

## マイルストーン

- [ ] testだけの未知カテゴリを安全に処理できる
- [ ] OOF target encodingが必要な理由を説明できる
- [ ] groupby後も行数と元の並びを守れる
- [ ] 前処理リークをPipelineで構造的に防げる
