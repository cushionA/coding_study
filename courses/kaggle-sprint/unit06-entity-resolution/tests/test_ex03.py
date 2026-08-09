from conftest import load_exercise
import numpy as np

ex = load_exercise("ex03_cosine_and_pooling")


# test_cosine_similarity_geometry が要求仕様を満たすか確認する。
def test_cosine_similarity_geometry():
    assert np.isclose(ex.cosine_similarity([1, 0], [2, 0]), 1.0)
    assert np.isclose(ex.cosine_similarity([1, 0], [0, 1]), 0.0)
    assert ex.cosine_similarity([0, 0], [1, 1]) == 0.0


# test_pairwise_cosine_shape_diagonal が要求仕様を満たすか確認する。
def test_pairwise_cosine_shape_diagonal():
    result = ex.pairwise_cosine(np.array([[1, 0], [0, 1], [1, 1]], dtype=float))
    assert result.shape == (3, 3)
    assert np.allclose(np.diag(result), 1.0)
    assert np.allclose(result, result.T)


# test_masked_mean_pooling_excludes_padding が要求仕様を満たすか確認する。
def test_masked_mean_pooling_excludes_padding():
    emb = np.array([[[1, 2], [3, 4], [100, 100]], [[2, 0], [4, 2], [6, 4]]], dtype=float)
    mask = np.array([[1, 1, 0], [1, 1, 1]])
    result = ex.masked_mean_pooling(emb, mask)
    assert result.shape == (2, 2)
    assert np.allclose(result, [[2, 3], [4, 2]])


# test_masked_mean_pooling_all_padding_safe が要求仕様を満たすか確認する。
def test_masked_mean_pooling_all_padding_safe():
    result = ex.masked_mean_pooling(np.ones((1, 2, 3)), np.zeros((1, 2)))
    assert np.allclose(result, np.zeros((1, 3)))
