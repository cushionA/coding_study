import importlib.util
from pathlib import Path

import numpy as np
import pandas as pd


REVIEW = Path(__file__).with_name("2026-08-11_ex03_unseen_category.py")
spec = importlib.util.spec_from_file_location("review_ex03", REVIEW)
review = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(review)


def test_uses_only_training_categories_and_preserves_target_order():
    train = pd.DataFrame(
        {
            "category": ["book", "book", "game", "game", "game"],
            "price": [100, 300, 1000, 1500, 2500],
        }
    )
    target = pd.DataFrame({"category": ["game", "music", "book", "music"]})

    predictions, n_unseen = review.category_median_predict(train, target)

    assert isinstance(predictions, np.ndarray)
    assert predictions.tolist() == [1500.0, 1000.0, 200.0, 1000.0]
    assert n_unseen == 2


def test_does_not_require_the_hidden_target_column():
    train = pd.DataFrame({"category": ["A", "A", "B"], "price": [10, 30, 100]})
    target = pd.DataFrame({"category": ["B", "C"]})

    predictions, n_unseen = review.category_median_predict(train, target)

    assert np.allclose(predictions, [100.0, 30.0])
    assert n_unseen == 1
