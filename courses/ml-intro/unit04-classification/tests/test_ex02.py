from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex02_confusion_matrix")


# prepare_and_train は5点セット(X_train, X_test, y_train, y_test, model)を返す
def test_prepare_and_train_returns_fitted_model():
    X_train, X_test, y_train, y_test, model = ex.prepare_and_train()
    assert len(X_test) == len(y_test)
    preds = model.predict(X_test)
    assert len(preds) == len(X_test)


# get_confusion_matrix はクラス数xクラス数の正方行列を返し、対角線の合計は正解数と一致する
def test_get_confusion_matrix_shape_and_diagonal():
    X_train, X_test, y_train, y_test, model = ex.prepare_and_train()
    cm = ex.get_confusion_matrix(model, X_test, y_test)
    n_classes = len(set(y_test))
    assert cm.shape == (n_classes, n_classes)
    correct = np.trace(cm)
    preds = model.predict(X_test)
    assert correct == int((preds == y_test).sum())


# get_confusion_matrix の全要素の合計はテスト件数と一致する(境界値: 全予測が必ずどこかのセルに入る)
def test_get_confusion_matrix_total_equals_test_size():
    X_train, X_test, y_train, y_test, model = ex.prepare_and_train()
    cm = ex.get_confusion_matrix(model, X_test, y_test)
    assert cm.sum() == len(y_test)


# get_precision_recall は0〜1の範囲の値を2つ返し、wineデータでは高精度(0.8超)になる
def test_get_precision_recall_range():
    X_train, X_test, y_train, y_test, model = ex.prepare_and_train()
    precision, recall = ex.get_precision_recall(model, X_test, y_test)
    assert 0.0 <= precision <= 1.0
    assert 0.0 <= recall <= 1.0
    assert precision > 0.8
    assert recall > 0.8


# get_classification_report は文字列を返し、クラスラベルが含まれる
def test_get_classification_report_is_string():
    X_train, X_test, y_train, y_test, model = ex.prepare_and_train()
    report = ex.get_classification_report(model, X_test, y_test)
    assert isinstance(report, str)
    assert "precision" in report
    assert "recall" in report
