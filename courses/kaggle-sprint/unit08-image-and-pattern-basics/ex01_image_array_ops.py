# ex01_image_array_ops: 画像をshape・dtype・値域で検算する

import numpy as np


# 画像配列のshape/dtype/min/maxを辞書で返す
def image_summary(image: np.ndarray) -> dict[str, object]:
    # TODO: NumPy配列へ変換し4項目を取り出す
    raise NotImplementedError


# HWC画像をCHWへ変換する
def hwc_to_chw(image: np.ndarray) -> np.ndarray:
    # TODO: transposeで軸順を変える
    raise NotImplementedError


# CHW画像をHWCへ戻す
def chw_to_hwc(image: np.ndarray) -> np.ndarray:
    # TODO: 逆のtransposeを行う
    raise NotImplementedError


# RGBを輝度重み0.299/0.587/0.114でグレースケール化する
def rgb_to_grayscale(image: np.ndarray) -> np.ndarray:
    # TODO: float化して最後のチャネル軸へ重み付き和を取る
    raise NotImplementedError
