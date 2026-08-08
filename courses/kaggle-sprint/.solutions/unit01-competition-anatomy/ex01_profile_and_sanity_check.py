# ex01_profile_and_sanity_check: 任意の DataFrame を調べる再利用可能な関数
# lesson では train / test という特定の表に対して、その場限りの print で欠損や分布を見た。
# ここではその調査を「どんな DataFrame が来ても使い回せる関数」として部品化する。
# unit10(本番監視)では、この形の関数を毎日バッチで回して「昨日と比べて何が変わったか」を検知する。

import pandas as pd


# df の列ごとのプロファイル(dtype・欠損数・欠損率・ユニーク数・数値列なら min/max)を返す
# 戻り値: 列名を index にした DataFrame。列は ['dtype', 'n_missing', 'missing_rate', 'n_unique', 'min', 'max']
# 数値でない列の min/max は None にする。
def profile_columns(df):
    rows = {}
    for col in df.columns:
        s = df[col]
        is_numeric = pd.api.types.is_numeric_dtype(s)
        rows[col] = {
            "dtype": str(s.dtype),
            "n_missing": int(s.isna().sum()),
            "missing_rate": float(s.isna().mean()),
            "n_unique": int(s.nunique()),
            "min": float(s.min()) if is_numeric and s.notna().any() else None,
            "max": float(s.max()) if is_numeric and s.notna().any() else None,
        }
    return pd.DataFrame.from_dict(rows, orient="index")[
        ["dtype", "n_missing", "missing_rate", "n_unique", "min", "max"]
    ]


# target_col の欠損率を、group_col の値ごとに算出する。
# lesson では brand x category を固定でやったが、ここでは任意の2列の組で効くようにする。
# 戻り値: {グループ値: 欠損率(float)} の dict
def missing_rate_by_group(df, target_col, group_col):
    result = {}
    for g, sub in df.groupby(group_col, dropna=False):
        result[g] = float(sub[target_col].isna().mean())
    return result
