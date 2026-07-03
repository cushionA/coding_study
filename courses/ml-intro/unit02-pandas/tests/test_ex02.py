from conftest import load_exercise
import pandas as pd

ex = load_exercise("ex02_filter_select")


# threshold より大きい行だけが残る
def test_filter_by_threshold_basic():
    df = pd.DataFrame({"score": [10, 50, 30, 90]})
    result = ex.filter_by_threshold(df, "score", 30)
    assert list(result["score"]) == [50, 90]


# 該当する行が1つもない場合は空のDataFrame
def test_filter_by_threshold_none_match():
    df = pd.DataFrame({"score": [1, 2, 3]})
    result = ex.filter_by_threshold(df, "score", 100)
    assert len(result) == 0


# select_columns は指定した複数列だけを持つDataFrameを返す
def test_select_columns_basic():
    df = pd.DataFrame({"a": [1, 2], "b": [3, 4], "c": [5, 6]})
    result = ex.select_columns(df, ["a", "c"])
    assert list(result.columns) == ["a", "c"]


# first_n_rows は先頭n行だけを返す
def test_first_n_rows_basic():
    df = pd.DataFrame({"a": [1, 2, 3, 4, 5]})
    result = ex.first_n_rows(df, 2)
    assert list(result["a"]) == [1, 2]


# get_cell は指定した行ラベル・列の値を返す
def test_get_cell_basic():
    df = pd.DataFrame({"a": [10, 20, 30]}, index=["x", "y", "z"])
    assert ex.get_cell(df, "y", "a") == 20


# add_diff_column は新しい列を追加し、元のdfは変更しない
def test_add_diff_column_basic():
    df = pd.DataFrame({"a": [10, 20], "b": [3, 5]})
    result = ex.add_diff_column(df, "a", "b", "diff")
    assert list(result["diff"]) == [7, 15]
    assert "diff" not in df.columns
