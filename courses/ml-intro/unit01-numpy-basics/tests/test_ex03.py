from conftest import load_exercise
import numpy as np

ex = load_exercise("ex03_broadcasting")


# 各行に同じベクトルが加算される
def test_add_row_vector_basic():
    matrix = np.array([[1, 2, 3], [4, 5, 6]])
    vector = np.array([10, 20, 30])
    result = ex.add_row_vector(matrix, vector)
    expected = np.array([[11, 22, 33], [14, 25, 36]])
    assert np.array_equal(result, expected)


# normalize_rows は各行の合計が1になる
def test_normalize_rows_sums_to_one():
    matrix = np.array([[1.0, 1.0, 2.0], [2.0, 2.0, 4.0]])
    result = ex.normalize_rows(matrix)
    row_sums = result.sum(axis=1)
    assert np.allclose(row_sums, np.array([1.0, 1.0]))


# normalize_rows の実際の値も確認する
def test_normalize_rows_values():
    matrix = np.array([[1.0, 3.0]])
    result = ex.normalize_rows(matrix)
    assert np.allclose(result, np.array([[0.25, 0.75]]))


# center_columns は各列の平均が0になる
def test_center_columns_mean_zero():
    matrix = np.array([[1.0, 10.0], [2.0, 20.0], [3.0, 30.0]])
    result = ex.center_columns(matrix)
    col_means = result.mean(axis=0)
    assert np.allclose(col_means, np.array([0.0, 0.0]))


# center_columns は元の配列を変更しない
def test_center_columns_does_not_mutate_input():
    matrix = np.array([[1.0, 10.0], [2.0, 20.0]])
    ex.center_columns(matrix)
    assert np.allclose(matrix, np.array([[1.0, 10.0], [2.0, 20.0]]))
