import numpy as np


def weighted_blend(predictions, weights):
    predictions = np.asarray(predictions, dtype=float)
    weights = np.asarray(weights, dtype=float)
    if predictions.ndim != 2 or predictions.shape[1] != len(weights):
        raise ValueError("shape mismatch")
    if not np.isclose(weights.sum(), 1.0):
        raise ValueError("weights must sum to 1")
    return predictions @ weights


def search_two_model_weight(y_true, pred_a, pred_b, grid_size=101):
    y_true, pred_a, pred_b = map(lambda x: np.asarray(x, dtype=float), (y_true, pred_a, pred_b))
    best = (None, float("inf"))
    for weight in np.linspace(0.0, 1.0, grid_size):
        pred = weight * pred_a + (1 - weight) * pred_b
        score = float(np.sqrt(np.mean((y_true - pred) ** 2)))
        if score < best[1]:
            best = (float(weight), score)
    return best


def rank_average(predictions):
    predictions = np.asarray(predictions, dtype=float)
    n = predictions.shape[0]
    ranks = np.empty_like(predictions)
    for j in range(predictions.shape[1]):
        ranks[:, j] = np.argsort(np.argsort(predictions[:, j])) / max(n - 1, 1)
    return ranks.mean(axis=1)
