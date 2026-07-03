from conftest import load_exercise
import pandas as pd
import pytest

ex = load_exercise("ex01_dataframe")


# make_dataframe は辞書からDataFrameを作る
def test_make_dataframe_basic():
    data = {"name": ["taro", "hanako"], "score": [80, 90]}
    df = ex.make_dataframe(data)
    assert list(df.columns) == ["name", "score"]
    assert list(df["score"]) == [80, 90]


# get_column は指定した列をSeriesで返す
def test_get_column_basic():
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    result = ex.get_column(df, "b")
    assert list(result) == [4, 5, 6]


# shape_of は (行数, 列数) を返す
def test_shape_of_basic():
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    assert ex.shape_of(df) == (3, 2)


# 1行だけのDataFrameでも動く(境界値)
def test_shape_of_single_row():
    df = pd.DataFrame({"a": [1]})
    assert ex.shape_of(df) == (1, 1)


# column_mean は指定列の平均を返す
def test_column_mean_basic():
    df = pd.DataFrame({"score": [10, 20, 30]})
    assert ex.column_mean(df, "score") == pytest.approx(20.0)
