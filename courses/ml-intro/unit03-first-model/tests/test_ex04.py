from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


# build_model は学習済みモデルとテストデータを返す
def test_build_model_returns_fitted_model_and_test_data():
    model, X_test, y_test = ex.build_model()
    assert hasattr(model, "coef_")
    assert X_test.shape == (89, 10)
    assert y_test.shape == (89,)


# evaluate_model は mae と r2 を含む辞書を返す
def test_evaluate_model_keys():
    model, X_test, y_test = ex.build_model()
    result = ex.evaluate_model(model, X_test, y_test)
    assert set(result.keys()) == {"mae", "r2"}


# evaluate_model の値は妥当な範囲(diabetesデータでの典型的なLinearRegressionの性能)
def test_evaluate_model_reasonable_values():
    model, X_test, y_test = ex.build_model()
    result = ex.evaluate_model(model, X_test, y_test)
    assert 20 < result["mae"] < 70
    assert 0.3 < result["r2"] < 0.6


# find_worst_predictions は残差の絶対値が大きい順にk件のインデックスを返す
def test_find_worst_predictions_order_and_length():
    y_test = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    preds = np.array([10.0, 22.0, 25.0, 70.0, 51.0])
    # 残差絶対値: [0, 2, 5, 30, 1] -> 大きい順のインデックスは 3, 2, 1, 4, 0
    result = ex.find_worst_predictions(y_test, preds, k=3)
    assert len(result) == 3
    assert list(result) == [3, 2, 1]


# find_worst_predictions はkのデフォルト値(5)でも動く
def test_find_worst_predictions_default_k():
    model, X_test, y_test = ex.build_model()
    preds = model.predict(X_test)
    result = ex.find_worst_predictions(y_test, preds)
    assert len(result) == 5


# run_pipeline は mae, r2, worst_indices を含む最終レポートを返す
def test_run_pipeline_report_structure():
    report = ex.run_pipeline()
    assert set(report.keys()) == {"mae", "r2", "worst_indices"}
    assert len(report["worst_indices"]) == 5
    assert 0.3 < report["r2"] < 0.6


# run_pipeline の worst_indices は有効な範囲(0〜88、テストデータは89件)のインデックス
def test_run_pipeline_worst_indices_valid_range():
    report = ex.run_pipeline()
    for idx in report["worst_indices"]:
        assert 0 <= idx < 89
