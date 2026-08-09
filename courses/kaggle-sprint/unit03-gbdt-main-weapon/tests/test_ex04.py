from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


def _data():
    rng = np.random.default_rng(2)
    X = rng.normal(size=(90, 3))
    price = np.exp(2 + X[:, 0] - 0.4 * X[:, 1])
    y = np.log1p(price)
    return X[:70], y[:70], X[70:], y[70:]


# 統合関数は必要な4項目とvalid行数ぶんの予測を返す
def test_train_price_baseline_contract():
    Xtr, ytr, Xva, yva = _data()
    result = ex.train_price_baseline(Xtr, ytr, Xva, yva, stopping_rounds=5)
    assert set(result) == {"model", "prediction_log", "best_iteration", "rmsle"}
    assert result["prediction_log"].shape == (20,)
    assert result["best_iteration"] >= 1
    assert result["rmsle"] >= 0.0


# expm1後は負の価格を返さない
def test_to_price_clips_negative_values():
    assert np.allclose(ex.to_price(np.array([0.0, np.log(3.0), -10.0])), [0.0, 2.0, 0.0])


# 同率重要度でも指定件数だけ名前を返す
def test_top_features_returns_k_names():
    class Model:
        feature_importances_ = np.array([1, 9, 3])
    assert ex.top_features(Model(), ["a", "b", "c"], k=2) == ["b", "c"]
