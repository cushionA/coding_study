import numpy as np


def train_linear_head(features, labels, n_classes, steps=200, lr=0.1, seed=42):
    X = np.asarray(features, dtype=float)
    y = np.asarray(labels, dtype=int)
    rng = np.random.default_rng(seed)
    weight = rng.normal(scale=0.01, size=(X.shape[1], n_classes))
    bias = np.zeros(n_classes)
    one_hot = np.eye(n_classes)[y]
    for _ in range(steps):
        logits = X @ weight + bias
        exp = np.exp(logits - logits.max(axis=1, keepdims=True))
        probabilities = exp / exp.sum(axis=1, keepdims=True)
        grad = (probabilities - one_hot) / len(X)
        weight -= lr * (X.T @ grad)
        bias -= lr * grad.sum(axis=0)
    return weight, bias


def predict_linear_head(features, weight, bias):
    return np.argmax(np.asarray(features) @ np.asarray(weight) + np.asarray(bias), axis=1)


def choose_strategy(n_samples, domain_gap, compute_budget):
    if n_samples < 1000 or compute_budget == "low":
        return "freeze"
    if n_samples >= 5000 and domain_gap == "large" and compute_budget == "high":
        return "full"
    return "staged"


def input_memory_mib(batch, channels, height, width, bytes_per_value=4):
    return batch * channels * height * width * bytes_per_value / (1024 ** 2)
