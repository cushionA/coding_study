from conftest import load_exercise
import numpy as np

ex = load_exercise("ex03_lr_schedule")


# test_warmup_linear_key_steps が要求仕様を満たすか確認する。
def test_warmup_linear_key_steps():
    assert ex.warmup_linear_lr(0, 10, 2, 1.0) == 0.0
    assert ex.warmup_linear_lr(2, 10, 2, 1.0) == 1.0
    assert ex.warmup_linear_lr(9, 10, 2, 1.0) == 0.125


# test_lr_series_shape_and_peak が要求仕様を満たすか確認する。
def test_lr_series_shape_and_peak():
    values = ex.lr_series(10, 2, 0.01)
    assert values.shape == (10,)
    assert np.isclose(values.max(), 0.01)
    assert values[-1] < values[2]


# test_effective_batch_size が要求仕様を満たすか確認する。
def test_effective_batch_size():
    assert ex.effective_batch_size(8, 4, 2) == 64
