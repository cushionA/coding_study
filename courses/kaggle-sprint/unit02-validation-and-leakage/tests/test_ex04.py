from conftest import load_exercise
import numpy as np
import pandas as pd

ex = load_exercise("ex04_capstone")


# groupが跨ぎ、validが未来である分割を正しく要約する
def test_audit_split_reports_overlap_unknown_and_time():
    groups = np.array(["A", "B", "A", "C"])
    dates = pd.to_datetime(["2026-01-01", "2026-01-02", "2026-02-01", "2026-02-02"])
    report = ex.audit_split(groups, dates, [0, 1], [2, 3])
    assert report == {
        "n_train": 2,
        "n_valid": 2,
        "group_overlap_count": 1,
        "unknown_group_rate": 0.5,
        "chronological": True,
    }


# 日付が逆転していればchronologicalはFalse
def test_audit_split_detects_future_in_train():
    report = ex.audit_split(
        np.array(["A", "B"]),
        pd.to_datetime(["2026-03-01", "2026-02-01"]),
        [0],
        [1],
    )
    assert report["chronological"] is False


# NaN以外の同じ位置を正解と予測から選ぶ
def test_select_validated_rows_uses_shared_mask():
    y, pred = ex.select_validated_rows(
        np.array([10.0, 20.0, 30.0, 40.0]),
        np.array([11.0, np.nan, 29.0, np.nan]),
    )
    assert np.array_equal(y, np.array([10.0, 30.0]))
    assert np.array_equal(pred, np.array([11.0, 29.0]))


# 全行未検証でも空配列を安全に返す
def test_select_validated_rows_all_nan():
    y, pred = ex.select_validated_rows(np.array([1.0, 2.0]), np.array([np.nan, np.nan]))
    assert y.size == pred.size == 0
