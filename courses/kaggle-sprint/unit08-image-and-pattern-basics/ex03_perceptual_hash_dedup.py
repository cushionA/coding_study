# ex03_perceptual_hash_dedup: 見た目が近い画像を短いbit列で探す

import numpy as np
from PIL import Image
from collections.abc import Sequence


# グレースケール縮小後、平均以上を1にしたbit配列を返す
def average_hash(image: Image.Image | np.ndarray, hash_size: int = 8) -> np.ndarray:
    # TODO: PILでLへ変換・resizeし、平均との比較を1次元bool配列にする
    raise NotImplementedError


# 横に隣接する画素の明暗差をbit列にしたdHashを返す
def difference_hash(image: Image.Image | np.ndarray, hash_size: int = 8) -> np.ndarray:
    # TODO: 横を1画素多く縮小し、隣接画素を比較する
    raise NotImplementedError


# 2本の同長bit列で異なる位置の数を返す
def hamming_distance(left: np.ndarray, right: np.ndarray) -> int:
    # TODO: bool配列の不一致を数える
    raise NotImplementedError


# hash一覧から距離がmax_distance以下の順不同indexペアを返す
def near_duplicate_pairs(
    hashes: Sequence[np.ndarray], max_distance: int
) -> set[tuple[int, int]]:
    # TODO: 全組合せを調べ、条件を満たすペアを集める
    raise NotImplementedError
