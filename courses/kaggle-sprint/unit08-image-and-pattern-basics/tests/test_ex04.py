from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


# augmentation が shape を保ち、左右反転と明るさを反映するか確認する。
def test_augment_image_contract():
    image = np.arange(24, dtype=np.uint8).reshape(2, 4, 3)
    result = ex.augment_image(image, horizontal_flip=True, brightness=0.5)
    assert result.shape == image.shape and result.dtype == np.uint8
    assert np.array_equal(result[:, -1], (image[:, 0] * 0.5).astype(np.uint8))


# 色 histogram がチャネルごとに正規化されるか確認する。
def test_color_histogram_shape_and_normalization():
    image = np.zeros((4, 4, 3), dtype=np.uint8)
    image[..., 1] = 255
    result = ex.color_histogram(image, bins=4)
    assert result.shape == (12,)
    assert np.allclose(result.reshape(3, 4).sum(axis=1), 1.0)


# HOG が有限な1次元特徴を返すか確認する。
def test_hog_features_is_one_dimensional_and_finite():
    image = np.zeros((32, 32, 3), dtype=np.uint8)
    image[:, 16:] = 255
    result = ex.hog_features(image)
    assert result.ndim == 1 and result.size > 0
    assert np.all(np.isfinite(result))


def _classification_data():
    negative = np.column_stack([np.linspace(-3, -1, 6), np.zeros(6)])
    positive = np.column_stack([np.linspace(1, 3, 6), np.zeros(6)])
    features = np.vstack([negative, positive])
    labels = np.array([0] * 6 + [1] * 6)
    groups = np.array([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5])
    return features, labels, groups


# groupを跨がず、全行を一度ずつ検証したOOF確率になるか確認する。
def test_make_oof_predictions_no_group_leak_and_complete():
    features, labels, groups = _classification_data()
    result = ex.make_oof_predictions(
        features,
        labels,
        groups,
        feature_function=lambda row: row,
        augmenter=lambda row: row,
        n_splits=3,
    )
    assert np.all(np.isfinite(result["probabilities"]))
    for (train_index, valid_index), augmented_index in zip(result["folds"], result["augmented_indices"]):
        assert set(groups[train_index]).isdisjoint(set(groups[valid_index]))
        assert np.array_equal(augmented_index, train_index)
        assert set(augmented_index).isdisjoint(set(valid_index))
    assert np.mean((result["probabilities"] >= 0.5) == labels) >= 0.8


# OOFの外れ値を元の画像IDへ戻せるか確認する。
def test_misclassified_ids():
    assert ex.misclassified_ids(["a", "b", "c"], [0, 1, 1], [0.1, 0.2, 0.9]) == ["b"]
