from conftest import load_exercise
import numpy as np

ex = load_exercise("ex03_perceptual_hash_dedup")


# test_average_hash_shape_and_type が要求仕様を満たすか確認する。
def test_average_hash_shape_and_type():
    image = np.arange(64, dtype=np.uint8).reshape(8, 8)
    result = ex.average_hash(image)
    assert result.shape == (64,)
    assert result.dtype == bool


# test_average_hash_brightness_invariant_for_non_clipped_shift が要求仕様を満たすか確認する。
def test_average_hash_brightness_invariant_for_non_clipped_shift():
    image = np.tile(np.arange(8, dtype=np.uint8) * 10, (8, 1))
    assert np.array_equal(ex.average_hash(image), ex.average_hash(image + 20))


# dHashが横方向の変化をhash_size二乗のbit列へ変換するか確認する。
def test_difference_hash_direction_and_shape():
    image = np.tile(np.arange(9, dtype=np.uint8) * 20, (8, 1))
    result = ex.difference_hash(image, hash_size=8)
    assert result.shape == (64,)
    assert result.dtype == bool
    assert result.mean() > 0.9


# test_hamming_distance が要求仕様を満たすか確認する。
def test_hamming_distance():
    assert ex.hamming_distance([0, 1, 1], [1, 1, 0]) == 2


# test_near_duplicate_pairs_threshold が要求仕様を満たすか確認する。
def test_near_duplicate_pairs_threshold():
    hashes = [np.array([0, 0, 0]), np.array([0, 0, 1]), np.array([1, 1, 1])]
    assert ex.near_duplicate_pairs(hashes, 1) == {(0, 1)}
