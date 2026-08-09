from itertools import combinations


def all_pairs(n):
    return set(combinations(range(n), 2))


def blocking_pairs(records, key_functions):
    result = set()
    for key_fn in key_functions:
        buckets = {}
        for index, record in enumerate(records):
            buckets.setdefault(key_fn(record), []).append(index)
        for indices in buckets.values():
            result.update(combinations(indices, 2))
    return result


def pair_recall(candidates, true_pairs):
    truth = {tuple(sorted(pair)) for pair in true_pairs}
    if not truth:
        return 1.0
    found = {tuple(sorted(pair)) for pair in candidates}
    return len(found & truth) / len(truth)
