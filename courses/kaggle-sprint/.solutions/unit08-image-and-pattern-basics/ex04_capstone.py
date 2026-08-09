import numpy as np
from skimage.color import rgb2gray
from skimage.feature import hog
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedGroupKFold


def augment_image(image, horizontal_flip=False, brightness=1.0):
    array = np.asarray(image, dtype=float).copy()
    if horizontal_flip:
        array = array[:, ::-1, :]
    return np.clip(array * brightness, 0, 255).astype(np.uint8)


def color_histogram(image, bins=8):
    array = np.asarray(image)
    parts = []
    for channel in range(array.shape[2]):
        counts, _ = np.histogram(array[..., channel], bins=bins, range=(0, 256))
        parts.append(counts / max(counts.sum(), 1))
    return np.concatenate(parts)


def hog_features(image):
    gray = rgb2gray(np.asarray(image))
    return hog(
        gray,
        orientations=9,
        pixels_per_cell=(8, 8),
        cells_per_block=(2, 2),
        feature_vector=True,
    )


def stratified_group_splits(labels, groups, n_splits=3, random_state=42):
    labels = np.asarray(labels)
    groups = np.asarray(groups)
    splitter = StratifiedGroupKFold(
        n_splits=n_splits,
        shuffle=True,
        random_state=random_state,
    )
    return list(splitter.split(np.zeros(len(labels)), labels, groups))


def make_oof_predictions(images, labels, groups, feature_function, augmenter=None, n_splits=3, random_state=42):
    images = np.asarray(images)
    labels = np.asarray(labels, dtype=int)
    groups = np.asarray(groups)
    probabilities = np.full(len(labels), np.nan)
    folds = stratified_group_splits(labels, groups, n_splits, random_state)
    augmented_indices = []
    for train_index, valid_index in folds:
        train_images = images[train_index]
        if augmenter is not None:
            train_images = np.asarray([augmenter(image) for image in train_images])
        train_features = np.asarray([feature_function(image) for image in train_images])
        valid_features = np.asarray([feature_function(image) for image in images[valid_index]])
        augmented_indices.append(train_index.copy() if augmenter is not None else np.array([], dtype=int))
        model = LogisticRegression(random_state=random_state)
        model.fit(train_features, labels[train_index])
        probabilities[valid_index] = model.predict_proba(valid_features)[:, 1]
    return {"probabilities": probabilities, "folds": folds, "augmented_indices": augmented_indices}


def misclassified_ids(sample_ids, labels, probabilities, threshold=0.5):
    prediction = np.asarray(probabilities) >= threshold
    return [sample_id for sample_id, truth, pred in zip(sample_ids, labels, prediction) if truth != pred]
