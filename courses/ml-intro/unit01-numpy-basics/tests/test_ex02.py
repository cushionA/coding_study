from conftest import load_exercise
import numpy as np

ex = load_exercise("ex02_masking")


# threshold より大きい要素だけが残る
def test_filter_greater_than_basic():
    arr = np.array([1, 5, 3, 8, 2])
    result = ex.filter_greater_than(arr, 3)
    assert np.array_equal(result, np.array([5, 8]))


# 該当する要素が1つもない場合は空配列
def test_filter_greater_than_none_match():
    arr = np.array([1, 2, 3])
    result = ex.filter_greater_than(arr, 100)
    assert len(result) == 0


# 偶数だけが残る
def test_filter_even_basic():
    arr = np.array([1, 2, 3, 4, 5, 6])
    result = ex.filter_even(arr)
    assert np.array_equal(result, np.array([2, 4, 6]))


# clip_below は threshold 未満の要素だけを value に置き換える
def test_clip_below_basic():
    arr = np.array([1, 5, 2, 8])
    result = ex.clip_below(arr, 3, 0)
    assert np.array_equal(result, np.array([0, 5, 0, 8]))


# clip_below は元の配列を変更しない(copy() 忘れのバグを弾く)
def test_clip_below_does_not_mutate_input():
    arr = np.array([1, 5, 2, 8])
    ex.clip_below(arr, 3, 0)
    assert np.array_equal(arr, np.array([1, 5, 2, 8]))


# count_matching は条件を満たす要素数を返す
def test_count_matching_basic():
    arr = np.array([1, 5, 3, 8, 2])
    assert ex.count_matching(arr, 3) == 2
