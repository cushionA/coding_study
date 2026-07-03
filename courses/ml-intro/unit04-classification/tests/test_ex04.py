from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex04_capstone")


# load_and_split はwineデータをtest_size=0.2で分割する(178件中36件がテスト)
def test_load_and_split_sizes():
    X_train, X_test, y_train, y_test = ex.load_and_split()
    assert len(X_test) == 36
    assert len(X_train) == 142


# train_and_score は学習済みモデルと0.8超のaccuracyを返す(wineはLogisticRegressionにとって易しい)
def test_train_and_score_high_accuracy():
    X_train, X_test, y_train, y_test = ex.load_and_split()
    model, accuracy = ex.train_and_score(X_train, X_test, y_train, y_test)
    assert 0.0 <= accuracy <= 1.0
    assert accuracy > 0.8
    assert len(model.predict(X_test)) == len(X_test)


# cross_validated_accuracy は0〜1の範囲の平均accuracyを返す
def test_cross_validated_accuracy_range():
    X_train, X_test, y_train, y_test = ex.load_and_split()
    X = np.vstack([X_train, X_test])
    y = np.concatenate([y_train, y_test])
    accuracy = ex.cross_validated_accuracy(X, y, cv=5)
    assert 0.0 <= accuracy <= 1.0
    assert accuracy > 0.8


# most_confused_pair は混同行列の非対角要素のうち最大の (真のラベル, 予測ラベル) を返す
# 手作りの小さい予測結果で検証: 真のラベル1が予測0に3回誤分類される、突出した混同パターンを作る
def test_most_confused_pair_on_fixed_predictions():
    class DummyModel:
        def predict(self, X):
            return np.array([0, 0, 0, 0, 1, 2])

    y_test = np.array([0, 1, 1, 1, 1, 2])
    row, col, count = ex.most_confused_pair(DummyModel(), None, y_test)
    # 真=1の4件中3件が予測0に誤分類され、これが唯一最大の非対角セルになる
    assert (row, col) == (1, 0)
    assert count == 3


# most_confused_pair は実データに対しても有効なクラスの組を返し、countは0以上の整数になる
# (wineはLogisticRegressionにとって易しく、たまたま取り違えが0件になることもある)
def test_most_confused_pair_valid_output_on_real_data():
    X_train, X_test, y_train, y_test = ex.load_and_split()
    model, _ = ex.train_and_score(X_train, X_test, y_train, y_test)
    row, col, count = ex.most_confused_pair(model, X_test, y_test)
    n_classes = len(set(y_test))
    assert 0 <= row < n_classes
    assert 0 <= col < n_classes
    assert count >= 0
