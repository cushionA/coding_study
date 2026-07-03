from conftest import load_exercise
import numpy as np

ex = load_exercise("ex01_split_fit_predict")


# load_data は (X, y) を返し、442人分・10特徴量のデータになっている
def test_load_data_shape():
    X, y = ex.load_data()
    assert X.shape == (442, 10)
    assert y.shape == (442,)


# split_data はtest_size=0.2で分割する(442件の20% = 約89件)
def test_split_data_sizes():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y)
    assert len(X_test) == 89
    assert len(X_train) == 353
    assert len(y_train) == len(X_train)
    assert len(y_test) == len(X_test)


# random_state=42 固定なので、同じ関数を2回呼んでも同じ分割になる(再現性)
def test_split_data_reproducible():
    X, y = ex.load_data()
    X_train1, X_test1, _, _ = ex.split_data(X, y)
    X_train2, X_test2, _, _ = ex.split_data(X, y)
    assert np.array_equal(X_train1, X_train2)
    assert np.array_equal(X_test1, X_test2)


# train_model は fit 済みのモデルを返す(coef_ 属性はfit後にしか生成されない)
def test_train_model_returns_fitted_model():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y)
    model = ex.train_model(X_train, y_train)
    assert hasattr(model, "coef_")
    assert model.coef_.shape == (10,)


# predict はテストデータと同じ件数の予測値を返す
def test_predict_returns_correct_length():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y)
    model = ex.train_model(X_train, y_train)
    preds = ex.predict(model, X_test)
    assert len(preds) == len(X_test)


# predict の返り値は現実的な範囲に収まる(diabetesのyは25〜346程度)
def test_predict_reasonable_range():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y)
    model = ex.train_model(X_train, y_train)
    preds = ex.predict(model, X_test)
    assert preds.min() > -200
    assert preds.max() < 600
