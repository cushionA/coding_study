from conftest import load_exercise
import pandas as pd
import numpy as np
import pytest

ex = load_exercise("ex03_missing_groupby")


# count_missing は欠損値の個数を返す
def test_count_missing_basic():
    df = pd.DataFrame({"a": [1, np.nan, 3, np.nan]})
    assert ex.count_missing(df, "a") == 2


# 欠損が1つもない場合は0
def test_count_missing_none():
    df = pd.DataFrame({"a": [1, 2, 3]})
    assert ex.count_missing(df, "a") == 0


# fillna_with_mean は欠損を平均値で埋め、元のdfは変更しない
def test_fillna_with_mean_basic():
    df = pd.DataFrame({"a": [10.0, np.nan, 30.0]})
    result = ex.fillna_with_mean(df, "a")
    assert result["a"].isna().sum() == 0
    assert result["a"].iloc[1] == pytest.approx(20.0)
    assert df["a"].isna().sum() == 1


# drop_rows_with_missing は指定列に欠損がある行を除去する
def test_drop_rows_with_missing_basic():
    df = pd.DataFrame({"a": [1, np.nan, 3], "b": [4, 5, np.nan]})
    result = ex.drop_rows_with_missing(df, ["a", "b"])
    assert len(result) == 1
    assert list(result["a"]) == [1]


# group_mean はグループごとの平均をSeriesで返す
def test_group_mean_basic():
    df = pd.DataFrame({"grp": ["x", "x", "y"], "val": [10, 20, 30]})
    result = ex.group_mean(df, "grp", "val")
    assert result.loc["x"] == pytest.approx(15.0)
    assert result.loc["y"] == pytest.approx(30.0)


# group_agg はグループごとの平均と件数を同時に返す
def test_group_agg_basic():
    df = pd.DataFrame({"grp": ["x", "x", "y"], "val": [10, 20, 30]})
    result = ex.group_agg(df, "grp", "val")
    assert result.loc["x", "mean"] == pytest.approx(15.0)
    assert result.loc["x", "count"] == 2
    assert result.loc["y", "count"] == 1
