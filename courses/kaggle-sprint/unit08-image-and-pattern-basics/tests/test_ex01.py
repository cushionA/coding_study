from conftest import load_exercise
import numpy as np

ex = load_exercise("ex01_image_array_ops")


# test_image_summary_contract が要求仕様を満たすか確認する。
def test_image_summary_contract():
    image = np.array([[[0, 10, 255]]], dtype=np.uint8)
    assert ex.image_summary(image) == {"shape": (1, 1, 3), "dtype": "uint8", "min": 0.0, "max": 255.0}


# test_hwc_chw_roundtrip が要求仕様を満たすか確認する。
def test_hwc_chw_roundtrip():
    image = np.arange(2 * 3 * 4).reshape(2, 3, 4)
    chw = ex.hwc_to_chw(image)
    assert chw.shape == (4, 2, 3)
    assert np.array_equal(ex.chw_to_hwc(chw), image)


# test_rgb_to_grayscale_weights_and_shape が要求仕様を満たすか確認する。
def test_rgb_to_grayscale_weights_and_shape():
    image = np.array([[[255, 0, 0], [0, 255, 0]]], dtype=np.uint8)
    result = ex.rgb_to_grayscale(image)
    assert result.shape == (1, 2)
    assert np.allclose(result, [[255 * 0.299, 255 * 0.587]])


# test_rgb_to_grayscale_avoids_uint8_overflow が要求仕様を満たすか確認する。
def test_rgb_to_grayscale_avoids_uint8_overflow():
    result = ex.rgb_to_grayscale(np.full((1, 1, 3), 255, dtype=np.uint8))
    assert np.isclose(result[0, 0], 255.0)
