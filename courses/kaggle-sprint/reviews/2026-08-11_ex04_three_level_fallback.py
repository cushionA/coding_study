"""復習: 組み合わせ → グループ → 全体、の3段退避。"""

import numpy as np
import pandas as pd


def three_level_median_predict(
    train_df: pd.DataFrame,
    target_df: pd.DataFrame,
    group_col: str = "department",
    detail_col: str = "grade",
    target_col: str = "amount",
) -> np.ndarray:
    """中央値で target_df を予測する。

    優先順位は (group_col, detail_col) の組 → group_col 単独 → 全体。
    すべての統計量は train_df からだけ計算すること。
    """
    # TODO: 同じ順序・同じ長さの np.ndarray を返す
    first_median = {}
    second_median = {}

    for gr in train_df[group_col].unique():
        part = train_df[train_df[group_col] == gr]
        second_median[gr] = part[target_col].median()
        for det in train_df[detail_col].unique():
            first_median[(gr,det)] = part.loc[train_df[detail_col] == det,target_col].median()

    median = train_df[target_col].median()
    res = []
    for i,row in target_df.iterrows():
        v = first_median.get((row[group_col],row[detail_col]),pd.NA)
        v = v if pd.isna(v) == False else second_median.get(row[group_col],pd.NA)
        v = v if pd.isna(v) == False else median
        res.append(v)

    return np.array(res)