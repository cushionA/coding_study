# ex02_resize_and_normalize: 比率を守ってサイズと値分布を揃える

import numpy as np
from PIL import Image


# 中央から指定height/widthを切り出す
def center_crop(image: np.ndarray, height: int, width: int) -> np.ndarray:
    # TODO: 中心から開始位置を計算して2軸をsliceする
    raise NotImplementedError


# アスペクト比を保ってtarget内へresizeし、残りをpad_valueで埋める
def resize_with_padding(
    image: np.ndarray,
    target_height: int,
    target_width: int,
    pad_value: int = 0,
) -> np.ndarray:
    # TODO: 縮尺を小さい方に合わせ、PILでresizeして中央へ貼る
    raise NotImplementedError


# HWC画像群(N,H,W,C)をチャネルごとに標準化する
# 戻り値: (normalized, mean, std)。mean/std shapeは(1,1,1,C)
def normalize_channels(
    images: np.ndarray, eps: float = 1e-6
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    # TODO: batch/height/width軸でmean/stdをkeepdims計算する
    raise NotImplementedError
