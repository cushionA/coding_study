from conftest import load_exercise
import numpy as np
import pandas as pd

ex = load_exercise("ex03_detect_duplicate_leak")


# 検証4行のうち2行が未知entityなら未知率は0.5
def test_unknown_entity_rate_counts_rows():
    entities = np.array(["A", "B", "A", "C", "D", "B"])
    rate = ex.unknown_entity_rate(entities, [0, 1], [2, 3, 4, 5])
    assert rate == 0.5


# 検証側が空なら0.0を返す
def test_unknown_entity_rate_empty_valid():
    assert ex.unknown_entity_rate(np.array(["A"]), [0], []) == 0.0


# trainだけにある列から目的変数は除外する
def test_train_only_columns_excludes_target_and_sorts():
    train = pd.DataFrame({"id": [1], "price": [10], "discount": [0.1], "secret": [9]})
    test = pd.DataFrame({"id": [2], "discount": [0.2]})
    assert ex.train_only_columns(train, test, "price") == ["secret"]


# 数式リークの復元は配列全体に働く
def test_reconstruct_price_vectorized():
    result = ex.reconstruct_price(np.array([100.0, 250.0]), np.array([0.2, 0.1]))
    assert np.allclose(result, [80.0, 225.0])
