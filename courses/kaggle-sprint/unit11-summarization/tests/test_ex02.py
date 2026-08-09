from conftest import load_exercise
import numpy as np
import pytest

ex = load_exercise("ex02_mmr_and_rouge")


# test_mmr_select_avoids_redundant_second が要求仕様を満たすか確認する。
def test_mmr_select_avoids_redundant_second():
    relevance = np.array([1.0, 0.95, 0.8])
    similarity = np.array([[1, 0.99, 0.1], [0.99, 1, 0.2], [0.1, 0.2, 1]], dtype=float)
    assert ex.mmr_select(relevance, similarity, 2, lambda_weight=0.5) == [0, 2]


# test_rouge_n_counts_duplicates が要求仕様を満たすか確認する。
def test_rouge_n_counts_duplicates():
    result = ex.rouge_n(["a", "a", "b"], ["a", "b", "b"], 1)
    assert result["precision"] == pytest.approx(2 / 3)
    assert result["recall"] == pytest.approx(2 / 3)


# test_lcs_length_order_sensitive が要求仕様を満たすか確認する。
def test_lcs_length_order_sensitive():
    assert ex.lcs_length(list("ABCBDAB"), list("BDCABA")) == 4


# test_rouge_l_perfect_and_empty が要求仕様を満たすか確認する。
def test_rouge_l_perfect_and_empty():
    assert ex.rouge_l(["a", "b"], ["a", "b"])["f1"] == 1.0
    assert ex.rouge_l([], ["a"])["f1"] == 0.0
