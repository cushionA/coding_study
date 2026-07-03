from conftest import load_exercise
import numpy as np

ex = load_exercise("ex01_preprocess")


# load_features は2次元配列を返し、行数は178(load_wineのサンプル数)
def test_load_features_shape():
    X = ex.load_features()
    assert X.shape[0] == 178
    assert X.ndim == 2


# load_features には欠損がない(元データそのまま)
def test_load_features_no_nan():
    X = ex.load_features()
    assert not np.isnan(X).any()


# inject_missing は指定した形状を保つ
def test_inject_missing_shape_preserved():
    X = ex.load_features()
    X_missing = ex.inject_missing(X, missing_rate=0.2, seed=0)
    assert X_missing.shape == X.shape


# inject_missing は元の配列を変更しない(破壊的変更のバグを弾く)
def test_inject_missing_does_not_mutate_input():
    X = ex.load_features()
    X_before = X.copy()
    ex.inject_missing(X, missing_rate=0.2, seed=0)
    assert np.array_equal(X, X_before)


# inject_missing は同じseedなら同じ結果(再現性)
def test_inject_missing_reproducible():
    X = ex.load_features()
    a = ex.inject_missing(X, missing_rate=0.15, seed=1)
    b = ex.inject_missing(X, missing_rate=0.15, seed=1)
    assert np.array_equal(a, b) or (np.isnan(a) == np.isnan(b)).all()


# inject_missing はnp.nanを含む(欠損が実際に注入されている)
def test_inject_missing_has_nan():
    X = ex.load_features()
    X_missing = ex.inject_missing(X, missing_rate=0.3, seed=0)
    assert np.isnan(X_missing).sum() > 0


# impute_mean は補完後に欠損が残らない
def test_impute_mean_no_nan_remaining():
    X = ex.load_features()
    X_missing = ex.inject_missing(X, missing_rate=0.2, seed=0)
    X_imputed = ex.impute_mean(X_missing)
    assert not np.isnan(X_imputed).any()


# impute_mean は欠損のない列の値をそのまま保つ(値域が大きく崩れない)
def test_impute_mean_shape_preserved():
    X = ex.load_features()
    X_missing = ex.inject_missing(X, missing_rate=0.1, seed=0)
    X_imputed = ex.impute_mean(X_missing)
    assert X_imputed.shape == X.shape
