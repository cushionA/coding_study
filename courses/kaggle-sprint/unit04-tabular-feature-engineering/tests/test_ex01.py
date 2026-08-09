from conftest import load_exercise
import numpy as np
import pandas as pd

ex = load_exercise("ex01_categorical_encoding")


# frequencyは全行に占める割合になる
def test_fit_frequency_encoder_rates():
    mapping = ex.fit_frequency_encoder(pd.Series(["A", "A", "B", "C"]))
    assert mapping["A"] == 0.5
    assert mapping["B"] == 0.25


# testだけの未知カテゴリは指定値になる
def test_apply_frequency_encoder_unknown():
    result = ex.apply_frequency_encoder(["A", "Z"], {"A": 0.6}, unknown_value=-1.0)
    assert np.allclose(result, [0.6, -1.0])


# one-hotはtrain/testで同じ列数になり未知カテゴリでも例外にならない
def test_one_hot_train_test_alignment():
    train = pd.DataFrame({"color": ["red", "blue"], "size": ["S", "M"]})
    test = pd.DataFrame({"color": ["green"], "size": ["S"]})
    tr, te, names, encoder = ex.one_hot_train_test(train, test, ["color", "size"])
    assert tr.shape[1] == te.shape[1] == len(names)
    assert te.shape[0] == 1
    assert any("color" in n for n in names)
    assert "green" not in set(encoder.categories_[0])
    assert encoder.handle_unknown == "ignore"


# 欠損も学習時の1カテゴリとして数える
def test_fit_frequency_encoder_includes_missing():
    mapping = ex.fit_frequency_encoder(pd.Series(["A", None, None]))
    assert sum(mapping.values()) == 1.0
    assert max(mapping.values()) == 2 / 3
