# ex02_resize_and_normalize: 比率を守ってサイズと値分布を揃える

import numpy as np
from PIL import Image


# 中央から指定height/widthを切り出す
def center_crop(image, height, width):
    # TODO: 中心から開始位置を計算して2軸をsliceする
    raise NotImplementedError


# アスペクト比を保ってtarget内へresizeし、残りをpad_valueで埋める
def resize_with_padding(image, target_height, target_width, pad_value=0):
    # TODO: 縮尺を小さい方に合わせ、PILでresizeして中央へ貼る
    raise NotImplementedError


# HWC画像群(N,H,W,C)をチャネルごとに標準化する
# 戻り値: (normalized, mean, std)。mean/std shapeは(1,1,1,C)
def normalize_channels(images, eps=1e-6):
    # TODO: batch/height/width軸でmean/stdをkeepdims計算する
    raise NotImplementedError
