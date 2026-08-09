from collections import Counter
import numpy as np


def mmr_select(relevance, similarity, n, lambda_weight=0.7):
    relevance = np.asarray(relevance, dtype=float)
    similarity = np.asarray(similarity, dtype=float)
    selected = []
    remaining = set(range(len(relevance)))
    while remaining and len(selected) < n:
        best = max(remaining, key=lambda i: (lambda_weight * relevance[i] - (1 - lambda_weight) * (max(similarity[i, j] for j in selected) if selected else 0.0), -i))
        selected.append(best)
        remaining.remove(best)
    return selected


def _ngrams(tokens, n):
    return Counter(tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1))


def _prf(overlap, candidate_count, reference_count):
    precision = overlap / candidate_count if candidate_count else 0.0
    recall = overlap / reference_count if reference_count else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1}


def rouge_n(candidate_tokens, reference_tokens, n=1):
    candidate = _ngrams(candidate_tokens, n)
    reference = _ngrams(reference_tokens, n)
    overlap = sum(min(count, reference[gram]) for gram, count in candidate.items())
    return _prf(overlap, sum(candidate.values()), sum(reference.values()))


def lcs_length(left, right):
    dp = [[0] * (len(right) + 1) for _ in range(len(left) + 1)]
    for i in range(1, len(left) + 1):
        for j in range(1, len(right) + 1):
            dp[i][j] = dp[i - 1][j - 1] + 1 if left[i - 1] == right[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
    return dp[-1][-1]


def rouge_l(candidate_tokens, reference_tokens):
    return _prf(lcs_length(candidate_tokens, reference_tokens), len(candidate_tokens), len(reference_tokens))
