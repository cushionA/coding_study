import numpy as np
import pandas as pd


def add_group_relative(df, group_col, value_col):
    out = df.copy()
    mean_col = f"{value_col}_group_mean"
    diff_col = f"{value_col}_group_diff"
    out[mean_col] = out.groupby(group_col, dropna=False)[value_col].transform("mean")
    out[diff_col] = out[value_col] - out[mean_col]
    return out


def add_weekday_cycle(df, date_col):
    out = df.copy()
    dates = pd.to_datetime(out[date_col])
    day = dates.dt.dayofweek
    angle = 2.0 * np.pi * day / 7.0
    out[f"{date_col}_dayofweek"] = day
    out[f"{date_col}_week_sin"] = np.sin(angle)
    out[f"{date_col}_week_cos"] = np.cos(angle)
    return out


def add_lag_one(df, entity_col, date_col, value_col):
    out = df.copy()
    out["__original_order__"] = np.arange(len(out))
    out[date_col] = pd.to_datetime(out[date_col])
    out = out.sort_values([entity_col, date_col, "__original_order__"])
    out[f"{value_col}_lag1"] = out.groupby(entity_col, dropna=False)[value_col].shift(1)
    return out.sort_values("__original_order__").drop(columns="__original_order__")
