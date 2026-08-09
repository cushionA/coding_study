import numpy as np
from PIL import Image


def center_crop(image, height, width):
    array = np.asarray(image)
    top = (array.shape[0] - height) // 2
    left = (array.shape[1] - width) // 2
    return array[top:top + height, left:left + width]


def resize_with_padding(image, target_height, target_width, pad_value=0):
    array = np.asarray(image)
    scale = min(target_height / array.shape[0], target_width / array.shape[1])
    new_h = max(1, round(array.shape[0] * scale))
    new_w = max(1, round(array.shape[1] * scale))
    resized = np.asarray(Image.fromarray(array).resize((new_w, new_h), Image.Resampling.BILINEAR))
    shape = (target_height, target_width) + (() if array.ndim == 2 else (array.shape[2],))
    out = np.full(shape, pad_value, dtype=array.dtype)
    top = (target_height - new_h) // 2
    left = (target_width - new_w) // 2
    out[top:top + new_h, left:left + new_w] = resized
    return out


def normalize_channels(images, eps=1e-6):
    images = np.asarray(images, dtype=float)
    mean = images.mean(axis=(0, 1, 2), keepdims=True)
    std = images.std(axis=(0, 1, 2), keepdims=True)
    return (images - mean) / np.maximum(std, eps), mean, std
