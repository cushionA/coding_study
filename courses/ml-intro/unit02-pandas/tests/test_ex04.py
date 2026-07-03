from conftest import load_exercise
import pandas as pd
import pytest

ex = load_exercise("ex04_capstone")


# load_iris_frame は150行5列(4特徴量+target)のDataFrameを返す
def test_load_iris_frame_shape():
    df = ex.load_iris_frame()
    assert df.shape == (150, 5)
    assert "target" in df.columns


# mean_by_species はtargetごとの平均を返す(irisは0,1,2の3クラス)
def test_mean_by_species_basic():
    df = ex.load_iris_frame()
    result = ex.mean_by_species(df, "petal length (cm)")
    assert set(result.index) == {0, 1, 2}
    # setosa(target=0)は花弁が明確に短い
    assert result.loc[0] < result.loc[2]


# filter_and_select はフィルタ後に指定列だけを残す
def test_filter_and_select_basic():
    df = pd.DataFrame({"a": [1, 2, 3, 4], "b": [10, 20, 30, 40], "c": [100, 200, 300, 400]})
    result = ex.filter_and_select(df, "a", 3, ["b", "c"])
    assert list(result.columns) == ["b", "c"]
    assert list(result["b"]) == [30, 40]


# inject_missing は指定割合の欠損を注入し、元のdfは変更しない
def test_inject_missing_basic():
    df = ex.load_iris_frame()
    result = ex.inject_missing(df, "sepal length (cm)", frac=0.2, seed=0)
    assert result["sepal length (cm)"].isna().sum() == 30
    assert df["sepal length (cm)"].isna().sum() == 0


# inject_missing はseedが同じなら再現性がある
def test_inject_missing_reproducible():
    df = ex.load_iris_frame()
    a = ex.inject_missing(df, "sepal length (cm)", frac=0.1, seed=42)
    b = ex.inject_missing(df, "sepal length (cm)", frac=0.1, seed=42)
    assert a["sepal length (cm)"].isna().equals(b["sepal length (cm)"].isna())


# clean_and_summarize は欠損を埋めたうえでtargetごとの平均を返す(NaNが残らない)
def test_clean_and_summarize_basic():
    df = ex.load_iris_frame()
    result = ex.clean_and_summarize(df, "petal width (cm)", frac=0.1, seed=0)
    assert set(result.index) == {0, 1, 2}
    assert not result.isna().any()
