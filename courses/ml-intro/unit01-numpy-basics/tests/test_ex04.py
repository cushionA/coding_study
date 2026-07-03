from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


# make_scores は指定した形状の配列を返す
def test_make_scores_shape():
    scores = ex.make_scores(4, 3, seed=0)
    assert scores.shape == (4, 3)


# make_scores は同じseedなら同じ結果(再現性)
def test_make_scores_reproducible():
    a = ex.make_scores(5, 2, seed=42)
    b = ex.make_scores(5, 2, seed=42)
    assert np.array_equal(a, b)


# make_scores の値は0〜100の範囲に収まる
def test_make_scores_value_range():
    scores = ex.make_scores(10, 4, seed=1)
    assert scores.min() >= 0
    assert scores.max() <= 100


# student_averages は行ごとの平均を返す
def test_student_averages_basic():
    scores = np.array([[10, 20, 30], [0, 0, 0]])
    result = ex.student_averages(scores)
    assert np.allclose(result, np.array([20.0, 0.0]))


# count_passing は平均がthreshold以上の人数を返す
def test_count_passing_basic():
    scores = np.array([[100, 100], [0, 0], [60, 60]])
    assert ex.count_passing(scores, 60) == 2


# curve_by_subject は各科目(列)の平均が0になる
def test_curve_by_subject_mean_zero():
    scores = np.array([[10, 100], [20, 80], [30, 60]])
    result = ex.curve_by_subject(scores)
    col_means = result.mean(axis=0)
    assert np.allclose(col_means, np.array([0.0, 0.0]))
