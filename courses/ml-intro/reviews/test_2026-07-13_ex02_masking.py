import importlib.util
from pathlib import Path

import numpy as np


path = Path(__file__).with_name("2026-07-13_ex02_masking.py")
spec = importlib.util.spec_from_file_location("review_ex02_20260713", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_select_outside_range_keeps_values_below_low_or_above_high():
    values = np.array([2, 5, 8, 11, 14])
    result = module.select_outside_range(values, 5, 11)
    assert np.array_equal(result, np.array([2, 14]))


def test_select_outside_range_can_return_empty_array():
    values = np.array([5, 8, 11])
    result = module.select_outside_range(values, 5, 11)
    assert result.shape == (0,)
