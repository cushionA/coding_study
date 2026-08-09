import numpy as np


def cosine_similarity(left, right):
    left = np.asarray(left, dtype=float)
    right = np.asarray(right, dtype=float)
    denom = np.linalg.norm(left) * np.linalg.norm(right)
    return 0.0 if denom == 0 else float(np.dot(left, right) / denom)


def pairwise_cosine(matrix):
    matrix = np.asarray(matrix, dtype=float)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    normalized = np.divide(matrix, norms, out=np.zeros_like(matrix), where=norms != 0)
    return normalized @ normalized.T


def masked_mean_pooling(token_embeddings, attention_mask):
    embeddings = np.asarray(token_embeddings, dtype=float)
    weights = np.asarray(attention_mask, dtype=float)[:, :, None]
    numerator = (embeddings * weights).sum(axis=1)
    denominator = weights.sum(axis=1)
    return np.divide(numerator, denominator, out=np.zeros_like(numerator), where=denominator != 0)
