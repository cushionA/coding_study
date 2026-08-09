from conftest import load_exercise
import numpy as np
from scipy.sparse import csr_matrix

ex = load_exercise("ex03_linear_baseline")


# LinearSVCをfitしdecision_functionが使える
def test_fit_linear_svc_contract():
    X = csr_matrix([[2, 0], [3, 0], [0, 2], [0, 3]])
    model = ex.fit_linear_svc(X, ["A", "A", "B", "B"])
    assert hasattr(model, "coef_")
    assert model.decision_function(X).shape == (4,)


# macroとmicroを別々に計算する
def test_f1_summary_imbalanced():
    result = ex.f1_summary([0, 0, 0, 1], [0, 0, 0, 0])
    assert set(result) == {"macro_f1", "micro_f1"}
    assert result["macro_f1"] < result["micro_f1"]


# 指定クラスの係数上位語を順に返す
def test_top_terms_for_class():
    class Model:
        classes_ = np.array(["A", "B"])
        coef_ = np.array([[1.0, 3.0, 2.0], [9.0, 0.0, 1.0]])
    assert ex.top_terms_for_class(Model(), ["x", "y", "z"], "A", 2) == ["y", "z"]


# 存在しないクラス名は明確な例外になる
def test_top_terms_unknown_class():
    class Model:
        classes_ = np.array(["A", "B"])
        coef_ = np.ones((2, 2))
    import pytest
    with pytest.raises(ValueError):
        ex.top_terms_for_class(Model(), ["x", "y"], "Z")
