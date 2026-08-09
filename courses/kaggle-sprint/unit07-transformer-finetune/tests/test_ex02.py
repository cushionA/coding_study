from conftest import load_exercise
import numpy as np

ex = load_exercise("ex02_collate_and_mask")


# test_dynamic_pad_batch_longest が要求仕様を満たすか確認する。
def test_dynamic_pad_batch_longest():
    ids, mask = ex.dynamic_pad([[2, 5, 3], [2, 8, 9, 3]], pad_id=0)
    assert ids.shape == mask.shape == (2, 4)
    assert np.array_equal(ids[0], [2, 5, 3, 0])
    assert np.array_equal(mask[0], [1, 1, 1, 0])


# test_dynamic_pad_truncates_max_length が要求仕様を満たすか確認する。
def test_dynamic_pad_truncates_max_length():
    ids, mask = ex.dynamic_pad([[1, 2, 3, 4], [5]], max_length=2)
    assert np.array_equal(ids, [[1, 2], [5, 0]])
    assert np.array_equal(mask, [[1, 1], [1, 0]])


# test_attention_bias_shape_and_values が要求仕様を満たすか確認する。
def test_attention_bias_shape_and_values():
    result = ex.attention_bias(np.array([[1, 1, 0], [1, 0, 0]]))
    assert result.shape == (2, 1, 1, 3)
    assert result[0, 0, 0, 0] == 0.0
    assert result[0, 0, 0, 2] < -1e8


# test_count_padding が要求仕様を満たすか確認する。
def test_count_padding():
    assert ex.count_padding(np.array([[1, 0], [0, 0]])) == 3
