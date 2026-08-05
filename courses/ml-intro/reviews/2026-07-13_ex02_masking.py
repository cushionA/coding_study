import numpy as np


def select_outside_range(values: np.ndarray, low: float, high: float) -> np.ndarray:
    return values[(low > values) | (high < values)]
