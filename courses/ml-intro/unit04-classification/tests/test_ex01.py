from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex01_train_classifier")


# load_data はirisの特徴量(150件x4列)とラベル(150件、3クラス)を返す
def test_load_data_shape():
    X, y = ex.load_data()
    assert X.shape == (150, 4)
    assert y.shape == (150,)
    assert set(np.unique(y)) == {0, 1, 2}


# split_data はtest_size通りの件数比率で分割する
def test_split_data_sizes():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y, test_size=0.2)
    assert len(X_test) == 30
    assert len(X_train) == 120
    assert len(y_train) == len(X_train)
    assert len(y_test) == len(X_test)


# split_data はrandom_state固定で毎回同じ分割になる(再現性)
def test_split_data_reproducible():
    X, y = ex.load_data()
    _, X_test1, _, _ = ex.split_data(X, y)
    _, X_test2, _, _ = ex.split_data(X, y)
    assert np.array_equal(X_test1, X_test2)


# train_classifier は学習済みモデルを返し、predictできる
def test_train_classifier_returns_fitted_model():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y)
    model = ex.train_classifier(X_train, y_train)
    preds = model.predict(X_test)
    assert len(preds) == len(X_test)


# evaluate_accuracy はirisのような易しいデータで高い正解率(0.8超)を返す
def test_evaluate_accuracy_high_on_iris():
    X, y = ex.load_data()
    X_train, X_test, y_train, y_test = ex.split_data(X, y)
    model = ex.train_classifier(X_train, y_train)
    accuracy = ex.evaluate_accuracy(model, X_test, y_test)
    assert 0.0 <= accuracy <= 1.0
    assert accuracy > 0.8
