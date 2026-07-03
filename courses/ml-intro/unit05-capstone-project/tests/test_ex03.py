from conftest import load_exercise
from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import numpy as np

ex = load_exercise("ex03_train_evaluate")

X, y = load_wine(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=0)
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s = scaler.transform(X_test)


# train_classifier はfit済みのモデルを返す(predictが呼べる)
def test_train_classifier_returns_fitted_model():
    model = ex.train_classifier(X_train_s, y_train)
    preds = model.predict(X_test_s)
    assert len(preds) == len(X_test_s)


# train_classifier は同じrandom_stateなら同じ予測になる(再現性)
def test_train_classifier_reproducible():
    model_a = ex.train_classifier(X_train_s, y_train, random_state=0)
    model_b = ex.train_classifier(X_train_s, y_train, random_state=0)
    assert np.array_equal(model_a.predict(X_test_s), model_b.predict(X_test_s))


# evaluate_accuracy は0〜1の範囲の値を返す
def test_evaluate_accuracy_range():
    model = ex.train_classifier(X_train_s, y_train)
    acc = ex.evaluate_accuracy(model, X_test_s, y_test)
    assert 0.0 <= acc <= 1.0


# evaluate_accuracy は標準化された wine データで高精度(0.9以上)を達成できる
def test_evaluate_accuracy_high_on_wine():
    model = ex.train_classifier(X_train_s, y_train)
    acc = ex.evaluate_accuracy(model, X_test_s, y_test)
    assert acc >= 0.9


# evaluate_confusion_matrix はクラス数 x クラス数(wineは3クラス)の正方行列を返す
def test_evaluate_confusion_matrix_shape():
    model = ex.train_classifier(X_train_s, y_train)
    cm = ex.evaluate_confusion_matrix(model, X_test_s, y_test)
    n_classes = len(set(y))
    assert cm.shape == (n_classes, n_classes)


# evaluate_confusion_matrix の対角成分の合計は正解数と一致する
def test_evaluate_confusion_matrix_diagonal_matches_correct_count():
    model = ex.train_classifier(X_train_s, y_train)
    cm = ex.evaluate_confusion_matrix(model, X_test_s, y_test)
    y_pred = model.predict(X_test_s)
    correct = int((y_pred == y_test).sum())
    assert cm.trace() == correct
