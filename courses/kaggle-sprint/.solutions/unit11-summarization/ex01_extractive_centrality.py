import re
import numpy as np


def split_sentences(text):
    parts = re.split(r"(?<=[。！？!?])|[\r\n]+", str(text))
    return [part.strip() for part in parts if part.strip()]


def cosine_matrix(vectors):
    vectors = np.asarray(vectors, dtype=float)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    normalized = np.divide(vectors, norms, out=np.zeros_like(vectors), where=norms != 0)
    return normalized @ normalized.T


def sentence_centrality(similarity, damping=0.85, steps=100):
    matrix = np.maximum(np.asarray(similarity, dtype=float), 0.0).copy()
    np.fill_diagonal(matrix, 0.0)
    n = len(matrix)
    row_sum = matrix.sum(axis=1, keepdims=True)
    transition = np.divide(matrix, row_sum, out=np.full_like(matrix, 1 / max(n, 1)), where=row_sum != 0)
    scores = np.full(n, 1 / max(n, 1))
    for _ in range(steps):
        scores = (1 - damping) / n + damping * transition.T @ scores
    return scores / scores.sum()


def select_top_sentences(sentences, scores, n):
    selected = np.argsort(-np.asarray(scores))[:n]
    return [sentences[i] for i in sorted(selected)]
