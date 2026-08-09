from conftest import load_exercise
import numpy as np
import pandas as pd

ex = load_exercise("ex02_group_and_time_split")


# groupがfoldを跨いだときは共通値を検出する
def test_group_overlap_detects_shared_entities():
    groups = np.array(["P1", "P1", "P2", "P3"])
    assert ex.group_overlap(groups, [0, 2], [1, 3]) == {"P1"}


# 完全に分離されたgroupなら空集合になる
def test_group_overlap_empty_for_clean_split():
    groups = np.array(["P1", "P1", "P2", "P3"])
    assert ex.group_overlap(groups, [0, 1], [2, 3]) == set()


# cutoff当日をvalidへ入れ、位置インデックスを返す
def test_split_by_cutoff_boundary():
    dates = pd.Series(pd.to_datetime(["2026-01-01", "2026-02-01", "2026-02-02"]))
    tr, va = ex.split_by_cutoff(dates, "2026-02-01")
    assert np.array_equal(tr, np.array([0]))
    assert np.array_equal(va, np.array([1, 2]))


# OOFの0は予測済みであり、NaNだけを未検証とみなす
def test_validated_mask_distinguishes_zero_and_nan():
    mask = ex.validated_mask(np.array([0.0, np.nan, 2.0]))
    assert np.array_equal(mask, np.array([True, False, True]))
