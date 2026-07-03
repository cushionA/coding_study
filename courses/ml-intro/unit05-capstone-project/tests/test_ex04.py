from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


# load_data は569件(load_breast_cancerのサンプル数)の(X, y)を返す
def test_load_data_shape():
    X, y = ex.load_data()
    assert X.shape[0] == 569
    assert len(y) == 569


# add_synthetic_missing は元の配列を変更しない(破壊的変更のバグを弾く)
def test_add_synthetic_missing_does_not_mutate_input():
    X, _ = ex.load_data()
    X_before = X.copy()
    ex.add_synthetic_missing(X, missing_rate=0.1, seed=0)
    assert np.array_equal(X, X_before)


# add_synthetic_missing は欠損を実際に注入する
def test_add_synthetic_missing_has_nan():
    X, _ = ex.load_data()
    X_missing = ex.add_synthetic_missing(X, missing_rate=0.2, seed=0)
    assert np.isnan(X_missing).sum() > 0
    assert X_missing.shape == X.shape


# build_pipeline は imputer と scaler の2ステップを持つ
def test_build_pipeline_steps():
    pipeline = ex.build_pipeline()
    names = [name for name, _ in pipeline.steps]
    assert names == ["imputer", "scaler"]


# run_end_to_end は学習済みモデルとテスト正解率のタプルを返す
def test_run_end_to_end_returns_model_and_accuracy():
    X, y = ex.load_data()
    X_missing = ex.add_synthetic_missing(X, missing_rate=0.05, seed=0)
    model, accuracy = ex.run_end_to_end(X_missing, y, test_size=0.2, random_state=0)
    assert 0.0 <= accuracy <= 1.0
    assert hasattr(model, "predict")


# run_end_to_end は欠損入りデータでも高精度(0.9以上)を達成できる
def test_run_end_to_end_high_accuracy():
    X, y = ex.load_data()
    X_missing = ex.add_synthetic_missing(X, missing_rate=0.05, seed=0)
    _, accuracy = ex.run_end_to_end(X_missing, y, test_size=0.2, random_state=0)
    assert accuracy >= 0.9


# run_end_to_end は同じrandom_stateなら同じ正解率になる(再現性)
def test_run_end_to_end_reproducible():
    X, y = ex.load_data()
    X_missing = ex.add_synthetic_missing(X, missing_rate=0.05, seed=0)
    _, acc_a = ex.run_end_to_end(X_missing, y, test_size=0.2, random_state=0)
    _, acc_b = ex.run_end_to_end(X_missing, y, test_size=0.2, random_state=0)
    assert acc_a == acc_b
