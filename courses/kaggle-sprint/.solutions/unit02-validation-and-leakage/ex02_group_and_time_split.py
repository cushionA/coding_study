import numpy as np
import pandas as pd


def group_overlap(groups, train_idx, valid_idx):
    groups = np.asarray(groups)
    return set(groups[np.asarray(train_idx, dtype=int)]) & set(groups[np.asarray(valid_idx, dtype=int)])


def split_by_cutoff(dates, cutoff):
    values = pd.to_datetime(dates)
    cut = pd.Timestamp(cutoff)
    return np.where(values < cut)[0], np.where(values >= cut)[0]


def validated_mask(oof):
    return ~np.isnan(np.asarray(oof, dtype=float))
