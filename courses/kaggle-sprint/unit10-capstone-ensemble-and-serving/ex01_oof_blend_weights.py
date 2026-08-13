# ex01_oof_blend_weights: OOFだけを使って複数モデルを混ぜる

import numpy as np


# prediction行列(n_samples,n_models)を重み付き平均する
def weighted_blend(predictions: np.ndarray, weights: np.ndarray) -> np.ndarray:
    # TODO: shapeと重み和を検証し、行列積で1本へする
    raise NotImplementedError


# 2モデルの重みを0..1で探索しRMSE最小の(weight, score)を返す
def search_two_model_weight(
    y_true: np.ndarray, pred_a: np.ndarray, pred_b: np.ndarray, grid_size: int = 101
) -> tuple[float, float]:
    # TODO: wと1-wのblendを全候補で採点する
    raise NotImplementedError


# 各モデル内で予測を順位0..1へ変換して平均する
def rank_average(predictions: np.ndarray) -> np.ndarray:
    # TODO: 各モデルの予測値を0〜1の相対順位へ変換して平均する
    raise NotImplementedError
