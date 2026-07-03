from conftest import load_exercise
from sklearn.datasets import load_wine
import numpy as np

ex = load_exercise("ex02_pipeline")

X, y = load_wine(return_X_y=True)


# build_preprocess_pipeline は imputer と scaler の2ステップを持つ
def test_build_preprocess_pipeline_steps():
    pipeline = ex.build_preprocess_pipeline()
    names = [name for name, _ in pipeline.steps]
    assert names == ["imputer", "scaler"]


# build_preprocess_pipeline はfit_transformで欠損を埋めつつ標準化できる
def test_build_preprocess_pipeline_handles_missing():
    X_missing = X.copy().astype(float)
    X_missing[0, 0] = np.nan
    pipeline = ex.build_preprocess_pipeline()
    result = pipeline.fit_transform(X_missing)
    assert not np.isnan(result).any()


# split_data は指定したtest_sizeに応じた件数で分割する
def test_split_data_sizes():
    X_train, X_test, y_train, y_test = ex.split_data(X, y, test_size=0.2, random_state=0)
    assert len(X_test) == round(len(X) * 0.2)
    assert len(X_train) + len(X_test) == len(X)


# split_data は random_state 固定で再現性がある
def test_split_data_reproducible():
    a = ex.split_data(X, y, test_size=0.2, random_state=0)
    b = ex.split_data(X, y, test_size=0.2, random_state=0)
    assert np.array_equal(a[0], b[0])
    assert np.array_equal(a[2], b[2])


# fit_transform_split はtrainとtestを同じ列数に変換する
def test_fit_transform_split_shapes():
    X_train, X_test, y_train, y_test = ex.split_data(X, y, test_size=0.2, random_state=0)
    pipeline = ex.build_preprocess_pipeline()
    X_train_t, X_test_t = ex.fit_transform_split(pipeline, X_train, X_test)
    assert X_train_t.shape[1] == X_test_t.shape[1] == X.shape[1]
    assert X_train_t.shape[0] == len(X_train)
    assert X_test_t.shape[0] == len(X_test)


# fit_transform_split で変換したtrainデータは列ごとに平均0・標準偏差1に近い(標準化されている)
def test_fit_transform_split_train_is_scaled():
    X_train, X_test, y_train, y_test = ex.split_data(X, y, test_size=0.2, random_state=0)
    pipeline = ex.build_preprocess_pipeline()
    X_train_t, _ = ex.fit_transform_split(pipeline, X_train, X_test)
    assert np.allclose(X_train_t.mean(axis=0), 0.0, atol=1e-8)
    assert np.allclose(X_train_t.std(axis=0), 1.0, atol=1e-8)
