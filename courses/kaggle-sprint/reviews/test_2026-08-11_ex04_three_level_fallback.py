import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd


REVIEW = Path(__file__).with_name("2026-08-11_ex04_three_level_fallback.py")
spec = importlib.util.spec_from_file_location("review_ex04", REVIEW)
review = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(review)


def test_falls_back_from_pair_to_group_then_global():
    train = pd.DataFrame(
        {
            "department": ["home", "home", "home", "sports", "sports"],
            "grade": ["new", "new", "used", "new", "used"],
            "amount": [100, 200, 900, 500, 700],
        }
    )
    target = pd.DataFrame(
        {
            "department": ["home", "home", "sports", "music"],
            "grade": ["new", "rare", "used", "new"],
        }
    )

    predictions = review.three_level_median_predict(train, target)

    assert isinstance(predictions, np.ndarray)
    assert predictions.tolist() == [150.0, 200.0, 700.0, 500.0]


def test_accepts_custom_column_names_and_never_reads_a_target_from_target_df():
    train = pd.DataFrame({"shop": ["A", "A", "B"], "state": [1, 2, 1], "price": [10, 50, 100]})
    target = pd.DataFrame({"shop": ["A", "C"], "state": [3, 1]})

    predictions = review.three_level_median_predict(
        train, target, group_col="shop", detail_col="state", target_col="price"
    )

    assert np.allclose(predictions, [30.0, 50.0])
