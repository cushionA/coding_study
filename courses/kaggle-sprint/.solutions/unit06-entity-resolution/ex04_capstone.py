from difflib import SequenceMatcher

import numpy as np
from sklearn.linear_model import LogisticRegression


def build_pair_features(names, prices, embeddings, pairs):
    embeddings = np.asarray(embeddings, dtype=float)
    rows = []
    for left, right in pairs:
        name_similarity = SequenceMatcher(None, names[left], names[right]).ratio()
        price_difference = abs(float(prices[left]) - float(prices[right]))
        denominator = np.linalg.norm(embeddings[left]) * np.linalg.norm(embeddings[right])
        cosine = float(np.dot(embeddings[left], embeddings[right]) / denominator) if denominator else 0.0
        rows.append([name_similarity, price_difference, cosine])
    return np.asarray(rows, dtype=float)


def fit_pair_classifier(features, labels, random_state=42):
    return LogisticRegression(random_state=random_state).fit(features, labels)


def select_f1_threshold(y_true, scores, thresholds):
    y_true = np.asarray(y_true, dtype=int)
    scores = np.asarray(scores, dtype=float)
    best_threshold, best_f1 = None, -1.0
    for threshold in sorted(thresholds):
        prediction = scores >= threshold
        tp = int(((prediction == 1) & (y_true == 1)).sum())
        fp = int(((prediction == 1) & (y_true == 0)).sum())
        fn = int(((prediction == 0) & (y_true == 1)).sum())
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        if f1 > best_f1:
            best_threshold, best_f1 = threshold, f1
    return best_threshold, best_f1


def connected_components(n_items, matched_pairs):
    parent = list(range(n_items))

    def find(item):
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    for left, right in matched_pairs:
        left_root, right_root = find(left), find(right)
        if left_root != right_root:
            parent[right_root] = left_root
    roots = [find(item) for item in range(n_items)]
    mapping = {root: group for group, root in enumerate(dict.fromkeys(roots))}
    return np.asarray([mapping[root] for root in roots], dtype=int)
