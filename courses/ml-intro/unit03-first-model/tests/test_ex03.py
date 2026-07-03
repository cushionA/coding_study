from conftest import load_exercise
import numpy as np

ex = load_exercise("ex03_linear_regression")


# fit_single_feature は1列だけの特徴量で学習したモデルを返す(coef_の長さが1)
def test_fit_single_feature_coef_length():
    model, X_test, y_test = ex.fit_single_feature(2)
    assert model.coef_.shape == (1,)
    assert X_test.shape[1] == 1


# fit_all_features は10列全部で学習したモデルを返す
def test_fit_all_features_coef_length():
    model, X_test, y_test = ex.fit_all_features()
    assert model.coef_.shape == (10,)
    assert X_test.shape[1] == 10


# 全特徴量を使う方が、bmi単体より予測精度(R2)が高い
# (使える情報が多いほど一般に説明力が上がることを体感する)
def test_all_features_outperform_single_feature():
    model_single, Xs, ys = ex.fit_single_feature(2)
    model_all, Xa, ya = ex.fit_all_features()
    r2_single = ex.score_on_test(model_single, Xs, ys)
    r2_all = ex.score_on_test(model_all, Xa, ya)
    assert r2_all > r2_single


# 全特徴量モデルのR2は妥当な範囲に収まる(diabetesデータでは0.3〜0.6程度)
def test_all_features_r2_reasonable_range():
    model, X_test, y_test = ex.fit_all_features()
    r2 = ex.score_on_test(model, X_test, y_test)
    assert 0.3 < r2 < 0.6


# most_influential_feature は0〜9の範囲のインデックスを返す
def test_most_influential_feature_valid_index():
    model, X_test, y_test = ex.fit_all_features()
    idx = ex.most_influential_feature(model)
    assert 0 <= idx < 10


# most_influential_feature は係数の絶対値が最大の位置を正しく特定する
def test_most_influential_feature_correctness():
    class DummyModel:
        coef_ = np.array([0.1, -5.0, 2.0, 0.3])

    idx = ex.most_influential_feature(DummyModel())
    assert idx == 1


# score_on_test は完全一致する予測に対して1.0を返す(R2の定義確認)
def test_score_on_test_perfect_prediction():
    class DummyModel:
        def predict(self, X):
            return np.array([1.0, 2.0, 3.0, 4.0])

    y_test = np.array([1.0, 2.0, 3.0, 4.0])
    r2 = ex.score_on_test(DummyModel(), None, y_test)
    assert r2 == 1.0
