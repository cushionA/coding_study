import numpy as np
import pandas as pd


def unknown_entity_rate(entities, train_idx, valid_idx):
    entities = np.asarray(entities)
    valid_idx = np.asarray(valid_idx, dtype=int)
    if valid_idx.size == 0:
        return 0.0
    known = set(entities[np.asarray(train_idx, dtype=int)])
    return float(np.mean([value not in known for value in entities[valid_idx]]))


def train_only_columns(train, test, target_col):
    return sorted(set(train.columns) - set(test.columns) - {target_col})


def reconstruct_price(list_price, discount_rate):
    return np.asarray(list_price, dtype=float) * (1.0 - np.asarray(discount_rate, dtype=float))
