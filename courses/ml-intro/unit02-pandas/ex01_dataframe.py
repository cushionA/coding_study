# ex01_dataframe: DataFrame/Seriesの基本
# C#で「匿名型のList<T>」や「List<Dictionary<string,object>>」として持ち回っていた表データを、
# pandasでは1つのDataFrameオブジェクトとして扱う。列(Series)はDataFrameの一部。

import pandas as pd


# 列名 -> 値のリスト の辞書からDataFrameを作って返す
# (C#: 複数のList<T>を1つの表にまとめるイメージ。辞書のキーが列名になる)
def make_dataframe(data):
    # TODO: 辞書からDataFrameを作る専用のコンストラクタがある(ヒント参照)
    raise NotImplementedError


# DataFrameから指定した列名だけを抜き出してSeriesで返す
# (C#: list.Select(x => x.Prop) に相当するが、pandasでは df["列名"] で直接取れる)
def get_column(df, column):
    # TODO: 辞書のキーアクセスに似た書き方で1列だけ取り出す
    raise NotImplementedError


# DataFrameの行数・列数をタプル (行数, 列数) で返す
def shape_of(df):
    # TODO: DataFrame には shape という属性がある(NumPy配列と同じ)
    raise NotImplementedError


# 指定した列の平均値を返す
# (C#: list.Average(x => x.Prop) に相当)
def column_mean(df, column):
    # TODO: 列を取り出して .mean() を呼ぶ
    raise NotImplementedError
