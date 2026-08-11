"""復習: 学習側にないカテゴリを安全に扱う中央値ベースライン。"""

import numpy as np
import pandas as pd


def category_median_predict(
    train_df: pd.DataFrame,
    target_df: pd.DataFrame,
    category_col: str = "category",
    target_col: str = "price",
) -> tuple[np.ndarray, int]:
    """カテゴリ別中央値で target_df を予測する。

    train_df だけからカテゴリ別中央値と全体中央値を作ること。
    target_df のカテゴリが train_df に無いときは全体中央値を使う。
    戻り値は ``(予測値, 未知カテゴリへ退避した件数)``。

    C# なら ``Dictionary<string, double>`` を作って ``TryGetValue`` し、
    見つからないときだけ既定値へ落とすイメージ。
    """
    # TODO: target_df の target_col は参照しないで実装する
    cat_median = {}
    for cat in train_df[category_col].unique():
        cat_median[cat] =  train_df.loc[train_df[category_col] == cat,target_col].median()

    median = train_df[target_col].median()
    res = target_df[category_col].map(cat_median)
    error_count = res.isna().sum()
    res = res.fillna(median)
    return (np.array(res),error_count)

    
