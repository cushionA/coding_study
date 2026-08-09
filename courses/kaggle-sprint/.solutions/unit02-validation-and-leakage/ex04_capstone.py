import numpy as np
import pandas as pd


def audit_split(groups, dates, train_idx, valid_idx):
    groups = np.asarray(groups)
    dates = pd.to_datetime(dates)
    train_idx = np.asarray(train_idx, dtype=int)
    valid_idx = np.asarray(valid_idx, dtype=int)
    known = set(groups[train_idx])
    valid_groups = groups[valid_idx]
    unknown_rate = float(np.mean([g not in known for g in valid_groups])) if valid_idx.size else 0.0
    overlap = known & set(valid_groups)
    chronological = bool(valid_idx.size == 0 or train_idx.size == 0 or dates[train_idx].max() < dates[valid_idx].min())
    return {
        "n_train": int(train_idx.size),
        "n_valid": int(valid_idx.size),
        "group_overlap_count": len(overlap),
        "unknown_group_rate": unknown_rate,
        "chronological": chronological,
    }


def select_validated_rows(y, oof):
    y = np.asarray(y)
    oof = np.asarray(oof, dtype=float)
    mask = ~np.isnan(oof)
    return y[mask], oof[mask]
