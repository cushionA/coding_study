from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex01_oof_blend_weights")


# test_weighted_blend_matrix_product が要求仕様を満たすか確認する。
def test_weighted_blend_matrix_product():
    pred = np.array([[1, 3], [2, 4]], dtype=float)
    assert np.allclose(ex.weighted_blend(pred, [0.25, 0.75]), [2.5, 3.5])


# test_weighted_blend_rejects_bad_sum が要求仕様を満たすか確認する。
def test_weighted_blend_rejects_bad_sum():
    with pytest.raises(ValueError):
        ex.weighted_blend(np.ones((2, 2)), [1, 1])


# test_search_two_model_weight_finds_better_model が要求仕様を満たすか確認する。
def test_search_two_model_weight_finds_better_model():
    y = np.array([0.0, 1.0, 2.0])
    weight, score = ex.search_two_model_weight(y, y, y + 10, grid_size=11)
    assert weight == 1.0 and score == 0.0


# test_rank_average_scale_invariant が要求仕様を満たすか確認する。
def test_rank_average_scale_invariant():
    pred = np.array([[1, 100], [2, 300], [3, 200]], dtype=float)
    result = ex.rank_average(pred)
    assert result.shape == (3,)
    assert np.all((0 <= result) & (result <= 1))
