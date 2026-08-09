from conftest import load_exercise
import numpy as np

ex = load_exercise("ex02_lgbm_early_stopping")


def _data():
    x = np.arange(80, dtype=float).reshape(-1, 1)
    y = np.sin(x[:, 0] / 8.0) + x[:, 0] * 0.02
    return x[:60], y[:60], x[60:], y[60:]


# 指定した主要パラメータを持つモデルを作る
def test_make_regressor_parameters():
    model = ex.make_regressor(n_estimators=123, learning_rate=0.07, random_state=9)
    assert model.n_estimators == 123
    assert model.learning_rate == 0.07
    assert model.random_state == 9


# callback方式で学習しbest_iteration_が得られる
def test_fit_with_early_stopping_sets_best_iteration():
    Xtr, ytr, Xva, yva = _data()
    model = ex.fit_with_early_stopping(ex.make_regressor(80, 0.1), Xtr, ytr, Xva, yva, 5)
    assert 1 <= model.best_iteration_ <= 80
    assert model.predict(Xva).shape == (20,)


# 全件再学習モデルの木の本数はbest_iteration_になる
def test_refit_best_iteration_uses_selected_rounds():
    Xtr, ytr, Xva, yva = _data()
    fitted = ex.fit_with_early_stopping(ex.make_regressor(80, 0.1), Xtr, ytr, Xva, yva, 5)
    final = ex.refit_best_iteration(fitted, np.vstack([Xtr, Xva]), np.r_[ytr, yva])
    assert final.n_estimators == fitted.best_iteration_
    assert final.predict(Xva).shape == (20,)
