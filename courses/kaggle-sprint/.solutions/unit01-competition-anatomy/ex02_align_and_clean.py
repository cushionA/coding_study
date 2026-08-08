# ex02_align_and_clean: train/test のアライメント検査と、データのクリーニング
# lesson では train と test の列・dtype・カテゴリ集合を「1回だけ」突き合わせた。
# ここではその突き合わせを関数化し、さらに掃除の各ステップで何行減ったかを記録する規律を作る。

import numpy as np
import pandas as pd


# train と test を突き合わせてアライメント問題を検出する。
# categorical_cols: test 限定の値がないか調べたい列名のリスト(train・test 両方にある列のみ対象)。
# 戻り値の dict:
#   "train_only_columns": train にしかない列名のリスト(sorted)
#   "dtype_mismatches": 共通列のうち dtype が食い違う列 -> (train側dtype文字列, test側dtype文字列) の dict
#   "unseen_categories": categorical_cols のうち test にしかない値がある列 -> その値のリスト(sorted) の dict
def detect_alignment_issues(train, test, categorical_cols):
    train_only_columns = sorted(set(train.columns) - set(test.columns))

    common_cols = [c for c in train.columns if c in test.columns]
    dtype_mismatches = {}
    for c in common_cols:
        t_dtype = str(train[c].dtype)
        e_dtype = str(test[c].dtype)
        if t_dtype != e_dtype:
            dtype_mismatches[c] = (t_dtype, e_dtype)

    unseen_categories = {}
    for c in categorical_cols:
        if c not in train.columns or c not in test.columns:
            continue
        unseen = sorted(set(test[c].dropna()) - set(train[c].dropna()))
        if unseen:
            unseen_categories[c] = unseen

    return {
        "train_only_columns": train_only_columns,
        "dtype_mismatches": dtype_mismatches,
        "unseen_categories": unseen_categories,
    }


# df をクリーニングし、(掃除後のDataFrame, 各ステップの記録のlist) を返す。
# ステップは必ずこの順で行う:
#   1. item_id を除いた完全重複行を削除
#   2. price <= 0 の行を削除
#   3. price > 1_000_000 の行を削除(外れ値)
#   4. views < 0 を欠損(NaN)に置き換える(行は削除しない)
# 記録の各要素は {"step": str, "rows_before": int, "rows_after": int} の dict。
def clean_data(df):
    log = []

    feature_cols = [c for c in df.columns if c != "item_id"]
    before = len(df)
    df = df.drop_duplicates(subset=feature_cols)
    log.append({"step": "remove_duplicates", "rows_before": before, "rows_after": len(df)})

    before = len(df)
    df = df[df["price"] > 0]
    log.append({"step": "remove_price_zero_or_negative", "rows_before": before, "rows_after": len(df)})

    before = len(df)
    df = df[df["price"] <= 1_000_000]
    log.append({"step": "remove_price_outliers", "rows_before": before, "rows_after": len(df)})

    before = len(df)
    df = df.copy()
    df.loc[df["views"] < 0, "views"] = np.nan
    log.append({"step": "replace_negative_views", "rows_before": before, "rows_after": len(df)})

    return df, log
