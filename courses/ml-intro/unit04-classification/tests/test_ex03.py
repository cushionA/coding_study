from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex03_cross_validation")


# load_data はirisの (X, y) を返す
def test_load_data_shape():
    X, y = ex.load_data()
    assert X.shape == (150, 4)
    assert y.shape == (150,)


# cross_validate はcv件数分のスコア配列を返し、各スコアは0〜1の範囲
def test_cross_validate_length_and_range():
    X, y = ex.load_data()
    scores = ex.cross_validate(X, y, cv=5)
    assert len(scores) == 5
    assert np.all(scores >= 0.0) and np.all(scores <= 1.0)


# cross_validate はcv=3でも動く(境界値: 分割数を変えても正しく動く)
def test_cross_validate_different_cv():
    X, y = ex.load_data()
    scores = ex.cross_validate(X, y, cv=3)
    assert len(scores) == 3


# summarize_scores は (mean, std) のタプルを返す
def test_summarize_scores_basic():
    scores = np.array([0.9, 0.95, 0.85, 1.0, 0.9])
    mean, std = ex.summarize_scores(scores)
    assert mean == pytest.approx(0.92)
    assert std == pytest.approx(scores.std())


# irisはLogisticRegressionにとって易しいデータなので交差検証の平均accuracyは0.9を超える
def test_cross_validate_iris_high_accuracy():
    X, y = ex.load_data()
    scores = ex.cross_validate(X, y, cv=5)
    mean, _ = ex.summarize_scores(scores)
    assert mean > 0.9


# cross_validate_shuffled はKFoldオブジェクトを使っても同じ長さのスコア配列を返す
def test_cross_validate_shuffled_length():
    X, y = ex.load_data()
    scores = ex.cross_validate_shuffled(X, y, n_splits=5)
    assert len(scores) == 5
    assert np.all(scores >= 0.0) and np.all(scores <= 1.0)
