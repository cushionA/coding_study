from conftest import load_exercise
import numpy as np
import pandas as pd
import pytest

ex = load_exercise("ex01_profile_and_sanity_check")


# profile_columns: 数値列(欠損あり)の dtype/欠損数/欠損率/ユニーク数/min/max が正しい
def test_profile_columns_numeric_column():
    df = pd.DataFrame({"a": [1, 2, 3, None, 5], "b": ["x", "y", "x", None, "z"]})
    prof = ex.profile_columns(df)

    assert prof.loc["a", "dtype"] == "float64"
    assert prof.loc["a", "n_missing"] == 1
    assert prof.loc["a", "missing_rate"] == pytest.approx(0.2)
    assert prof.loc["a", "n_unique"] == 4, "None以外の値(1,2,3,5)で4種類のはず。nunique は既定で欠損を数えない。"
    assert prof.loc["a", "min"] == pytest.approx(1.0)
    assert prof.loc["a", "max"] == pytest.approx(5.0)


# profile_columns: 非数値列は min/max が欠損(NaN)になる
def test_profile_columns_non_numeric_column():
    df = pd.DataFrame({"a": [1, 2, 3, None, 5], "b": ["x", "y", "x", None, "z"]})
    prof = ex.profile_columns(df)

    assert prof.loc["b", "n_missing"] == 1
    assert prof.loc["b", "n_unique"] == 3, "x, y, z の3種類。Noneはユニーク値に数えない。"
    assert pd.isna(prof.loc["b", "min"]), "文字列列にmin/maxは定義できないのでNaNのはず(数値の0や文字列'x'ではない)"
    assert pd.isna(prof.loc["b", "max"])


# profile_columns: 欠損が無い列は missing_rate が 0.0 になる(境界値)
def test_profile_columns_no_missing():
    df = pd.DataFrame({"a": [1, 2, 3]})
    prof = ex.profile_columns(df)
    assert prof.loc["a", "n_missing"] == 0
    assert prof.loc["a", "missing_rate"] == pytest.approx(0.0)


# profile_columns: 戻り値は列名を index にした DataFrame で、全列ぶんの行がある
def test_profile_columns_shape():
    df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"], "c": [1.5, 2.5, None]})
    prof = ex.profile_columns(df)
    assert isinstance(prof, pd.DataFrame)
    assert prof.shape[0] == 3, "df の列数ぶんの行(a, b, c の3行)があるはず"
    assert set(prof.index) == {"a", "b", "c"}


# missing_rate_by_group: グループごとに欠損率が正しく分かれて出る
def test_missing_rate_by_group_basic():
    df = pd.DataFrame(
        {
            "grp": ["A", "A", "A", "B", "B", "B", "B", "C", "C"],
            "val": [1, None, 3, None, None, 6, 7, 10, 20],
        }
    )
    result = ex.missing_rate_by_group(df, target_col="val", group_col="grp")

    assert result["A"] == pytest.approx(1 / 3), "Aは3件中1件欠損"
    assert result["B"] == pytest.approx(0.5), "Bは4件中2件欠損"
    assert result["C"] == pytest.approx(0.0), "Cは欠損なし(0.0になるべきで、キー自体が無いのは誤り)"


# missing_rate_by_group: 全グループのキーがそろっている(件数の取り違えチェック)
def test_missing_rate_by_group_all_keys_present():
    df = pd.DataFrame(
        {
            "grp": ["A", "A", "B", "B"],
            "val": [1, 2, None, None],
        }
    )
    result = ex.missing_rate_by_group(df, target_col="val", group_col="grp")
    assert set(result.keys()) == {"A", "B"}
    assert result["B"] == pytest.approx(1.0)
