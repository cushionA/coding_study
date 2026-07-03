# ex04_capstone: 実データセットでの総合演習(ex01〜ex03の総合)
# sklearn付属のiris(あやめ)データセットをDataFrame化し、選択・欠損処理・groupbyを組み合わせる。
# 「CSVを読み込む」代わりに as_frame=True で最初からDataFrameとして受け取れるのがscikit-learnの特徴。

import pandas as pd
from sklearn.datasets import load_iris


# sklearnのirisデータセットをDataFrameで返す(target列を含む、150行5列)
# (C#的に言えば「組み込みのサンプルデータをDTOのListとして取得する」イメージ)
def load_iris_frame():
    return load_iris(as_frame=True).frame


# target列の値ごとに、指定した列の平均値を集計したSeriesを返す
# (ex03のgroup_meanと同じ発想をirisデータに適用する)
def mean_by_species(df, column):
    return df.groupby("target")[column].mean()


# 指定した列の値が threshold 以上の行だけを残し、
# さらに指定した列だけを選択したDataFrameを返す(フィルタ+選択の組み合わせ)
# (ex02のfilter_by_thresholdとselect_columnsを組み合わせる)
def filter_and_select(df, filter_column, threshold, columns):
    filtered = df[df[filter_column] >= threshold]
    return filtered[columns]


# 指定した列に意図的な欠損(NaN)を割合 frac だけ注入したDataFrameを返す(元のdfは変更しない)
# 乱数はシード固定(np.random.default_rng(seed))で再現性を持たせる
# 欠損させる行のインデックス位置は rng.choice(df.index, size=..., replace=False) で選ぶ
def inject_missing(df, column, frac, seed=0):
    import numpy as np

    result = df.copy()
    rng = np.random.default_rng(seed)
    n_missing = int(len(df) * frac)
    missing_idx = rng.choice(df.index, size=n_missing, replace=False)
    result.loc[missing_idx, column] = np.nan
    return result


# 欠損を注入した列を平均値で埋めたうえで、target列ごとの平均を再集計して返す
# (inject_missing -> fillna -> groupby の一連の流れをこの関数の中で行う)
def clean_and_summarize(df, column, frac=0.1, seed=0):
    missing_df = inject_missing(df, column, frac, seed=seed)
    missing_df[column] = missing_df[column].fillna(missing_df[column].mean())
    return mean_by_species(missing_df, column)
