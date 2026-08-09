from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


# test_train_linear_head_learns_separable_features が要求仕様を満たすか確認する。
def test_train_linear_head_learns_separable_features():
    X = np.array([[-2, 0], [-1, 0], [1, 0], [2, 0]], dtype=float)
    y = np.array([0, 0, 1, 1])
    weight, bias = ex.train_linear_head(X, y, 2, steps=300, lr=0.2)
    assert np.mean(ex.predict_linear_head(X, weight, bias) == y) == 1.0


# test_predict_linear_head_shape が要求仕様を満たすか確認する。
def test_predict_linear_head_shape():
    pred = ex.predict_linear_head(np.ones((3, 2)), np.array([[1, 0], [0, 1]]), np.zeros(2))
    assert pred.shape == (3,)


# test_choose_strategy_rules が要求仕様を満たすか確認する。
def test_choose_strategy_rules():
    assert ex.choose_strategy(100, "small", "low") == "freeze"
    assert ex.choose_strategy(10000, "large", "high") == "full"
    assert ex.choose_strategy(2000, "medium", "medium") == "staged"


# test_input_memory_resolution_quadratic が要求仕様を満たすか確認する。
def test_input_memory_resolution_quadratic():
    small = ex.input_memory_mib(8, 3, 64, 64)
    large = ex.input_memory_mib(8, 3, 128, 128)
    assert np.isclose(large, 4 * small)
