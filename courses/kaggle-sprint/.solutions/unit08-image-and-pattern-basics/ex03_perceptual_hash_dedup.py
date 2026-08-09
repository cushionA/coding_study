import numpy as np
from PIL import Image


def average_hash(image, hash_size=8):
    gray = Image.fromarray(np.asarray(image)).convert("L").resize((hash_size, hash_size), Image.Resampling.BILINEAR)
    values = np.asarray(gray, dtype=float)
    return (values >= values.mean()).reshape(-1)


def difference_hash(image, hash_size=8):
    gray = Image.fromarray(np.asarray(image)).convert("L")
    resized = gray.resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    values = np.asarray(resized, dtype=float)
    return (values[:, 1:] >= values[:, :-1]).reshape(-1)


def hamming_distance(left, right):
    return int(np.not_equal(np.asarray(left, dtype=bool), np.asarray(right, dtype=bool)).sum())


def near_duplicate_pairs(hashes, max_distance):
    return {(i, j) for i in range(len(hashes)) for j in range(i + 1, len(hashes)) if hamming_distance(hashes[i], hashes[j]) <= max_distance}
