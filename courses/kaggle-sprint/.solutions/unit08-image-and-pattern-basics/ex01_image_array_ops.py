import numpy as np


def image_summary(image):
    array = np.asarray(image)
    return {"shape": tuple(array.shape), "dtype": str(array.dtype), "min": float(array.min()), "max": float(array.max())}


def hwc_to_chw(image):
    return np.asarray(image).transpose(2, 0, 1)


def chw_to_hwc(image):
    return np.asarray(image).transpose(1, 2, 0)


def rgb_to_grayscale(image):
    array = np.asarray(image, dtype=float)
    return array @ np.array([0.299, 0.587, 0.114])
