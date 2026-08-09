import numpy as np
import pandas as pd


def fit_target_table(categories, target):
    frame = pd.DataFrame({"category": np.asarray(categories), "target": np.asarray(target, dtype=float)})
    return frame.groupby("category", dropna=False)["target"].mean(), float(frame["target"].mean())


def apply_target_table(categories, table, global_mean):
    return pd.Series(categories).map(table).fillna(global_mean).to_numpy(dtype=float)


def oof_target_encode(categories, target, splitter, groups=None):
    categories = np.asarray(categories)
    target = np.asarray(target, dtype=float)
    oof = np.full(len(target), np.nan)
    for train_idx, valid_idx in splitter.split(categories, target, groups):
        table, mean = fit_target_table(categories[train_idx], target[train_idx])
        oof[valid_idx] = apply_target_table(categories[valid_idx], table, mean)
    return oof
