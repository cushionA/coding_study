import importlib.util
from pathlib import Path

import numpy as np


path = Path(__file__).with_name("2026-07-13_ex04_capstone.py")
spec = importlib.util.spec_from_file_location("review_ex04_20260713", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_count_adjusted_passes_counts_each_student_after_subject_bonuses():
    scores = np.array([[55, 70, 88], [40, 58, 65], [90, 45, 49]])
    bonuses = np.array([5, 2, 10])
    result = module.count_adjusted_passes(scores, bonuses, 60)
    assert np.array_equal(result, np.array([3, 2, 1]))


def test_count_adjusted_passes_does_not_mutate_input():
    scores = np.array([[55, 70, 88], [40, 58, 65]])
    bonuses = np.array([5, 2, 10])
    module.count_adjusted_passes(scores, bonuses, 60)
    assert np.array_equal(scores, np.array([[55, 70, 88], [40, 58, 65]]))
