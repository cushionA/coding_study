import importlib.util
from pathlib import Path

import numpy as np


path = Path(__file__).with_name("2026-07-13_ex03_broadcasting.py")
spec = importlib.util.spec_from_file_location("review_ex03_20260713", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_center_rows_values():
    matrix = np.array([[1.0, 3.0, 5.0], [10.0, 20.0, 30.0]])
    result = module.center_rows(matrix)
    expected = np.array([[-2.0, 0.0, 2.0], [-10.0, 0.0, 10.0]])
    assert np.allclose(result, expected)


def test_center_rows_each_row_mean_is_zero():
    matrix = np.array([[2.0, 4.0, 6.0], [1.0, 1.0, 7.0]])
    result = module.center_rows(matrix)
    assert np.allclose(result.mean(axis=1), np.array([0.0, 0.0]))
