from conftest import load_exercise
import numpy as np

ex = load_exercise("ex01_extractive_centrality")


# test_split_sentences_keeps_endings_and_newlines が要求仕様を満たすか確認する。
def test_split_sentences_keeps_endings_and_newlines():
    assert ex.split_sentences("重要です。次です！\n最後") == ["重要です。", "次です！", "最後"]


# test_cosine_matrix_shape_symmetry が要求仕様を満たすか確認する。
def test_cosine_matrix_shape_symmetry():
    result = ex.cosine_matrix([[1, 0], [0, 1], [1, 1]])
    assert result.shape == (3, 3)
    assert np.allclose(result, result.T)
    assert np.allclose(np.diag(result), 1.0)


# test_sentence_centrality_normalized が要求仕様を満たすか確認する。
def test_sentence_centrality_normalized():
    sim = np.array([[1, 1, 0], [1, 1, 1], [0, 1, 1]], dtype=float)
    scores = ex.sentence_centrality(sim)
    assert np.isclose(scores.sum(), 1.0)
    assert scores[1] > scores[0]


# test_select_top_sentences_restores_order が要求仕様を満たすか確認する。
def test_select_top_sentences_restores_order():
    assert ex.select_top_sentences(["A", "B", "C"], [0.3, 0.9, 0.8], 2) == ["B", "C"]
