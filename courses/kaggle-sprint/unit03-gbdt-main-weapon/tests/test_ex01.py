from conftest import load_exercise
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge

ex = load_exercise("ex01_estimator_api")


# 共通APIで学習済みモデルと予測を返す
def test_fit_and_predict_returns_fitted_clone():
    original = LinearRegression()
    model, pred = ex.fit_and_predict(original, [[0], [1], [2]], [1, 3, 5], [[3], [4]])
    assert np.allclose(pred, [7, 9])
    assert hasattr(model, "coef_")
    assert not hasattr(original, "coef_"), "元のestimatorは未学習のままにする"


# 候補値ごとの結果をすべて返す
def test_compare_parameter_returns_every_candidate():
    scorer = lambda y, p: float(np.mean((np.asarray(y) - np.asarray(p)) ** 2))
    result = ex.compare_parameter(
        Ridge(), "alpha", [0.01, 10.0], [[0], [1], [2]], [0, 1, 2], [[3]], [3], scorer
    )
    assert set(result) == {0.01, 10.0}
    assert all(isinstance(v, float) for v in result.values())


# 各候補で元モデルを変更しない
def test_compare_parameter_does_not_mutate_original():
    model = Ridge(alpha=3.0)
    ex.compare_parameter(model, "alpha", [0.1], [[0], [1]], [0, 1], [[2]], [2], lambda y, p: 0.0)
    assert model.alpha == 3.0
