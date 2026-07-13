import numpy as np


def count_adjusted_passes(scores: np.ndarray, bonuses: np.ndarray, threshold: float) -> np.ndarray:
    s = scores + bonuses
    return (s>=threshold).sum(axis=1)