from pathlib import Path

from conftest import load_exercise
import numpy as np
import pandas as pd
import pytest

ex = load_exercise("ex02_align_and_clean")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def _load_real_data():
    train = pd.read_csv(DATA_DIR / "train.csv")
    test = pd.read_csv(DATA_DIR / "test.csv")
    return train, test


# detect_alignment_issues: train にしか無い列(price)が検出される
def test_detect_alignment_issues_train_only_column():
    train, test = _load_real_data()
    issues = ex.detect_alignment_issues(train, test, categorical_cols=["category"])
    assert issues["train_only_columns"] == ["price"]


# detect_alignment_issues: test 限定のカテゴリ値(ベビー・キッズ)が検出される
def test_detect_alignment_issues_unseen_category():
    train, test = _load_real_data()
    issues = ex.detect_alignment_issues(train, test, categorical_cols=["category", "condition"])
    assert issues["unseen_categories"]["category"] == ["ベビー・キッズ"], (
        "test['category'] にあって train['category'] に無い値。categorical_colsに無い列(condition)はキーに含めない"
    )
    assert "condition" not in issues["unseen_categories"], "condition は train/test で同じ値しか無いのでキー自体が無いはず"


# detect_alignment_issues: dtype が一致していれば dtype_mismatches は空(誤検出しない)
def test_detect_alignment_issues_no_dtype_mismatch_on_small_frame():
    a = pd.DataFrame({"x": [1, 2], "y": ["a", "b"]})
    b = pd.DataFrame({"x": [3, 4], "y": ["a", "c"]})
    issues = ex.detect_alignment_issues(a, b, categorical_cols=["y"])
    assert issues["dtype_mismatches"] == {}
    assert issues["train_only_columns"] == []


# detect_alignment_issues: dtype が食い違う列を検出する
def test_detect_alignment_issues_detects_dtype_mismatch():
    a = pd.DataFrame({"x": [1, 2, 3]})
    b = pd.DataFrame({"x": [1.5, 2.5, 3.5]})
    issues = ex.detect_alignment_issues(a, b, categorical_cols=[])
    assert "x" in issues["dtype_mismatches"]
    t_dtype, e_dtype = issues["dtype_mismatches"]["x"]
    assert t_dtype != e_dtype


# clean_data: 実データに対して4ステップぶんのログが正しい行数で記録される
def test_clean_data_real_data_row_counts():
    train, _ = _load_real_data()
    clean, log = ex.clean_data(train)

    assert train.shape == (3040, 9), "元データの形が変わっている場合はdata/train.csvを確認"
    steps = {entry["step"]: entry for entry in log}
    assert steps["remove_duplicates"]["rows_before"] == 3040
    assert steps["remove_duplicates"]["rows_after"] == 3000, (
        "重複除去後は3000行のはず。3040のままなら subset に item_id を含めてしまっている(全行ユニークで重複0件になる)"
    )
    assert steps["remove_price_zero_or_negative"]["rows_after"] == 2979, "price<=0の21件が消えていないと2979にならない"
    assert steps["remove_price_outliers"]["rows_after"] == 2969, "price>1,000,000の10件が消えていないと2969にならない"
    assert steps["replace_negative_views"]["rows_after"] == 2969, "views<0の置換は行を消さない(rows_beforeと同じはず)"
    assert clean.shape == (2969, 9), "log の最後のrows_afterと、実際に返るDataFrameのshapeが一致していないと集計が壊れている"


# clean_data: views<0 は行が消えるのではなく NaN に置き換わる
def test_clean_data_replaces_negative_views_not_drops():
    df = pd.DataFrame(
        {
            "item_id": ["a", "b", "c"],
            "category": ["家電", "家電", "家電"],
            "brand": ["x", "x", "x"],
            "condition": ["新品", "新品", "新品"],
            "shipping": [1, 1, 1],
            "listed_at": ["2026-01-01", "2026-01-02", "2026-01-03"],
            "description_len": [10, 20, 30],
            "views": [5, -1, 8],
            "price": [100, 200, 300],
        }
    )
    clean, log = ex.clean_data(df)
    assert len(clean) == 3, "views<0は値の置換であって行の削除ではない"
    assert pd.isna(clean.loc[clean["item_id"] == "b", "views"]).all()


# clean_data: 完全重複行(item_id以外が同一)が除去される
def test_clean_data_removes_exact_duplicates_excluding_item_id():
    df = pd.DataFrame(
        {
            "item_id": ["a", "b"],
            "category": ["家電", "家電"],
            "brand": ["x", "x"],
            "condition": ["新品", "新品"],
            "shipping": [1, 1],
            "listed_at": ["2026-01-01", "2026-01-01"],
            "description_len": [10, 10],
            "views": [5, 5],
            "price": [100, 100],
        }
    )
    clean, log = ex.clean_data(df)
    assert len(clean) == 1, "item_id以外の全列が一致しているので重複として1行減るはず"
