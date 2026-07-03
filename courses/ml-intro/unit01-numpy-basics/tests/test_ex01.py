from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex01_arrays")


# make_range(5) は [1,2,3,4,5] を返す
def test_make_range_basic():
    assert list(ex.make_range(5)) == [1, 2, 3, 4, 5]


# n=1 でも動く(境界値)
def test_make_range_single():
    assert list(ex.make_range(1)) == [1]


# double_all は元の配列を壊さず新しい値を返す
def test_double_all_basic():
    arr = np.array([1, 2, 3])
    result = ex.double_all(arr)
    assert np.array_equal(result, np.array([2, 4, 6]))


# double_all は呼び出し元の配列を変更しない(破壊的変更のバグを弾く)
def test_double_all_does_not_mutate_input():
    arr = np.array([1, 2, 3])
    ex.double_all(arr)
    assert np.array_equal(arr, np.array([1, 2, 3]))


# summarize は (sum, mean, max) のタプルを返す
def test_summarize_basic():
    arr = np.array([1, 2, 3, 4])
    total, mean, mx = ex.summarize(arr)
    assert total == 10
    assert mean == pytest.approx(2.5)
    assert mx == 4
