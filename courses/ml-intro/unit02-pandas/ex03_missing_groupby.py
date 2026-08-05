# ex03_missing_groupby: 欠損処理とgroupby集計
# 実データには欠損値(NaN)がつきもの。pandasでは isna で検出し、fillna/dropna で処理する。
# groupby().agg() はC#の LINQ GroupBy().Select(g => new { g.Key, Avg = g.Average(...) }) に相当する。

import pandas as pd
import numpy as np


# 指定した列に欠損値(NaN)がある行数を返す
def count_missing(df: pd.DataFrame, column: str) -> int:
    # TODO: df[column].isna() でブールのSeriesを作り、合計するとTrueの個数になる
    raise NotImplementedError


# 指定した列の欠損値を、その列の平均値で埋めたDataFrameを返す(元のdfは変更しない)
# (C#に「欠損」の概念はなく null 前提のコードになるが、pandasでは NaN を明示的に埋める)
def fillna_with_mean(df: pd.DataFrame, column: str) -> pd.DataFrame:
    # TODO: df.copy() してから、対象列に .fillna(平均値) を代入する
    raise NotImplementedError


# 指定した列のいずれかにでも欠損値がある行を削除したDataFrameを返す
def drop_rows_with_missing(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    # TODO: 欠損がある行を削除する専用のメソッドがある(対象列を絞る引数もある)
    raise NotImplementedError


# group_col の値ごとに value_col を集計する
# 戻り値は「グループごとの平均」を持つSeries(index=グループ, values=平均)
# (C#: list.GroupBy(x => x.GroupCol).Select(g => new { g.Key, Avg = g.Average(x => x.ValueCol) }))
def group_mean(df: pd.DataFrame, group_col: str, value_col: str) -> pd.Series:
    # TODO: 列ごとの平均をグループ単位で集計する(ヒント参照)
    raise NotImplementedError


# group_col の値ごとに value_col の平均・件数を同時に集計したDataFrameを返す
# 列名は "mean" と "count" にする
# (C#: g.Select(x => new { g.Key, Avg = g.Average(...), Count = g.Count() }))
def group_agg(df: pd.DataFrame, group_col: str, value_col: str) -> pd.DataFrame:
    # TODO: グループ化したうえで、複数の集計を同時に呼ぶ方法を考える
    raise NotImplementedError
