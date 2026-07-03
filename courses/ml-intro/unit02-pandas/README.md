# unit02: pandasによるデータ操作

このユニットを終えると、表形式データをDataFrameとして構築・選択・整形し、
groupbyで集計できるようになる。scikit-learnに渡す前処理の土台になる。

## なぜ学ぶか

実務のデータは「行=サンプル、列=項目」の表形式で、モデルに渡す前に必ず整形が要る。列の抜き出し・条件での行フィルタ・欠損値の穴埋め・カテゴリ別の集計は、どの分析でも前処理の大半を占める作業である。scikit-learn は欠損(NaN)があると学習でエラーになるため、ここで扱う `fillna`/`dropna` や `groupby` は「モデルを回す前の必須工程」そのもの。求人票の「pandasでのデータ前処理経験」の中身がこのユニットである。

## 概念: DataFrameとC#の匿名型リストの違い

- C#で `List<匿名型>` や `List<Dictionary<string,object>>` として持ち回っていた表データは、pandasでは1つの `DataFrame` オブジェクトになる。列は `Series` で、DataFrameは複数のSeriesの集まり。
- 行の絞り込みはLINQの `.Where(...)` に相当するが、pandasでは「条件式がブールの列を作り、それを添字にする」形になる(NumPyのブールマスクと同じ発想)。`loc` はラベル(列名・行ラベル)指定、`iloc` は位置(0始まりの整数)指定という違いがある。
- 欠損値(`NaN`)はC#にはない概念。`isna()` で検出し、`fillna()`/`dropna()` で埋めるか除去するかを明示的に選ぶ。
- `groupby().agg()` はLINQの `GroupBy().Select(g => new { g.Key, Avg = g.Average(...) })` に相当。グループごとの集計を1行で書ける。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_dataframe | DataFrame/Seriesの構築と基本操作 | 10分 |
| ex02_filter_select | loc/ilocによる行フィルタと列選択 | 10分 |
| ex03_missing_groupby | 欠損処理とgroupby集計 | 15分 |
| ex04_capstone | 実データセット(iris)での総合演習 | 15分 |

進め方:
1. **`lesson.ipynb` を開いて上から実行**(15〜25分)。解説を読み、予測し、「書いてみる」セルを埋める。ここで概念を身につける。
2. その後 `ex01_dataframe.py` から順に TODO を埋めて
   `python -m pytest courses/ml-intro/unit02-pandas/tests/test_ex01.py -q` が通れば次へ。lesson を見ながらで OK。

詰まったら Claude に聞く(ヒントを段階的にくれる)。自分で `hints/exNN.md` を tier1 から読んでもよい。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] 辞書からDataFrameを構築し、列・行数を確認できる
- [ ] ブールマスクとloc/ilocで行・列を選択できる
- [ ] 欠損値を検出し、fillna/dropnaで処理できる
- [ ] groupby().agg()でグループごとの集計ができる
