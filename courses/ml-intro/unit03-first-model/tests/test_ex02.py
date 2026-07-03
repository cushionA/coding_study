from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex02_metrics")

y_true = np.array([3.0, -0.5, 2.0, 7.0])
y_pred = np.array([2.5, 0.0, 2.0, 8.0])


# MAEは既知の値と一致する(誤差の絶対値の平均)
def test_compute_mae_basic():
    assert ex.compute_mae(y_true, y_pred) == pytest.approx(0.5)


# MSEは既知の値と一致する(誤差の2乗の平均)
def test_compute_mse_basic():
    assert ex.compute_mse(y_true, y_pred) == pytest.approx(0.375)


# RMSEはMSEの平方根になっている
def test_compute_rmse_matches_sqrt_mse():
    mse = ex.compute_mse(y_true, y_pred)
    rmse = ex.compute_rmse(y_true, y_pred)
    assert rmse == pytest.approx(np.sqrt(mse))


# 完全一致する予測ではR2は1.0になる
def test_compute_r2_perfect_prediction():
    y = np.array([1.0, 2.0, 3.0, 4.0])
    assert ex.compute_r2(y, y) == pytest.approx(1.0)


# 常に平均値を予測する場合、R2は0.0になる
def test_compute_r2_mean_prediction_is_zero():
    y = np.array([1.0, 2.0, 3.0, 4.0])
    mean_pred = np.full_like(y, y.mean())
    assert ex.compute_r2(y, mean_pred) == pytest.approx(0.0)


# evaluate_all は4つのキーを持つ辞書を返す
def test_evaluate_all_keys():
    result = ex.evaluate_all(y_true, y_pred)
    assert set(result.keys()) == {"mae", "mse", "rmse", "r2"}


# evaluate_all の各値は個別の関数の結果と一致する
def test_evaluate_all_values_consistent():
    result = ex.evaluate_all(y_true, y_pred)
    assert result["mae"] == pytest.approx(ex.compute_mae(y_true, y_pred))
    assert result["r2"] == pytest.approx(ex.compute_r2(y_true, y_pred))
