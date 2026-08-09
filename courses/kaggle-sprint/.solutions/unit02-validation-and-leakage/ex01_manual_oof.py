import numpy as np
import pandas as pd


def predict_fold_mean(keys, target, train_idx, valid_idx):
    keys = np.asarray(keys)
    target = np.asarray(target, dtype=float)
    train_idx = np.asarray(train_idx, dtype=int)
    valid_idx = np.asarray(valid_idx, dtype=int)
    table = pd.Series(target[train_idx]).groupby(keys[train_idx]).mean()
    mapped = pd.Series(keys[valid_idx]).map(table)
    unknown = int(mapped.isna().sum())
    return mapped.fillna(float(target[train_idx].mean())).to_numpy(dtype=float), unknown


def make_oof_mean_predictions(keys, target, splitter, groups=None):
    keys = np.asarray(keys)
    target = np.asarray(target, dtype=float)
    oof = np.full(len(target), np.nan)
    count = np.zeros(len(target), dtype=int)
    for train_idx, valid_idx in splitter.split(keys, target, groups):
        pred, _ = predict_fold_mean(keys, target, train_idx, valid_idx)
        oof[valid_idx] = pred
        count[valid_idx] += 1
    return oof, count
