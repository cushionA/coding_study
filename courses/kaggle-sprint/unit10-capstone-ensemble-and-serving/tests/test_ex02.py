from conftest import load_exercise
import numpy as np

ex = load_exercise("ex02_stacking_and_seed_average")


# test_seed_average が要求仕様を満たすか確認する。
def test_seed_average():
    assert np.allclose(ex.seed_average([np.array([1, 3]), np.array([3, 5])]), [2, 4])


# test_prediction_correlation_columns が要求仕様を満たすか確認する。
def test_prediction_correlation_columns():
    matrix = np.array([[1, 3, 1], [2, 2, 2], [3, 1, 3]], dtype=float)
    corr = ex.prediction_correlation(matrix)
    assert corr.shape == (3, 3)
    assert np.allclose(np.diag(corr), 1.0)
    assert corr[0, 1] < 0 and corr[0, 2] > 0


# test_stacking_fit_and_predict が要求仕様を満たすか確認する。
def test_stacking_fit_and_predict():
    X = np.array([[0, 0], [1, 0], [0, 1], [1, 1]], dtype=float)
    y = X[:, 0] + 2 * X[:, 1]
    model = ex.fit_stacking_meta(X, y, alpha=1e-8)
    pred = ex.predict_stacking(model, X)
    assert pred.shape == (4,)
    assert np.allclose(pred, y, atol=1e-5)


# test_seed_average_preserves_shape が要求仕様を満たすか確認する。
def test_seed_average_preserves_shape():
    result = ex.seed_average([np.zeros((3, 2)), np.ones((3, 2))])
    assert result.shape == (3, 2)
