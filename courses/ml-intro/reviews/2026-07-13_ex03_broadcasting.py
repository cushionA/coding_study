import numpy as np


def center_rows(matrix: np.ndarray) -> np.ndarray:
    return matrix - matrix.mean(axis=1,keepdims=True)
