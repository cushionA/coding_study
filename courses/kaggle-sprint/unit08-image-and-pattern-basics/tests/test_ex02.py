from conftest import load_exercise
import numpy as np

ex = load_exercise("ex02_resize_and_normalize")


# test_center_crop_shape_and_center が要求仕様を満たすか確認する。
def test_center_crop_shape_and_center():
    image = np.arange(5 * 7).reshape(5, 7)
    result = ex.center_crop(image, 3, 3)
    assert result.shape == (3, 3)
    assert result[1, 1] == image[2, 3]


# test_resize_with_padding_shape_and_aspect が要求仕様を満たすか確認する。
def test_resize_with_padding_shape_and_aspect():
    image = np.full((10, 20, 3), 255, dtype=np.uint8)
    result = ex.resize_with_padding(image, 20, 20, pad_value=0)
    assert result.shape == (20, 20, 3)
    assert np.all(result[:5] == 0) and np.all(result[-5:] == 0)
    assert result[10, 10, 0] == 255


# test_normalize_channels_shapes_and_statistics が要求仕様を満たすか確認する。
def test_normalize_channels_shapes_and_statistics():
    images = np.arange(2 * 2 * 2 * 3, dtype=float).reshape(2, 2, 2, 3)
    normalized, mean, std = ex.normalize_channels(images)
    assert normalized.shape == images.shape
    assert mean.shape == std.shape == (1, 1, 1, 3)
    assert np.allclose(normalized.mean(axis=(0, 1, 2)), 0.0)


# test_normalize_channels_constant_safe が要求仕様を満たすか確認する。
def test_normalize_channels_constant_safe():
    normalized, _, _ = ex.normalize_channels(np.ones((2, 3, 3, 1)))
    assert np.all(np.isfinite(normalized))
    assert np.allclose(normalized, 0.0)
