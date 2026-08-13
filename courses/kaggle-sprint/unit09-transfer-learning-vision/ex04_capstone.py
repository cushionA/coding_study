# ex04_capstone: 固定特徴上のheadを学習し、転移戦略とメモリを判断する

import numpy as np


# 固定features上の多クラス線形headを勾配降下で学習する
# 戻り値: (weight, bias)
def train_linear_head(
    features: np.ndarray,
    labels: np.ndarray,
    n_classes: int,
    steps: int = 200,
    lr: float = 0.1,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    # TODO: softmax cross entropyのweight/bias勾配を反復更新する
    raise NotImplementedError


# weight/biasでクラス予測を返す
def predict_linear_head(
    features: np.ndarray, weight: np.ndarray, bias: np.ndarray
) -> np.ndarray:
    # TODO: logitsの最大位置を返す
    raise NotImplementedError


# データ量・ドメイン差・予算から freeze / staged / full を返す
def choose_strategy(n_samples: int, domain_gap: float, compute_budget: float) -> str:
    # TODO: 小データ/低予算はfreeze、大きな差と高予算はfull、残りはstaged
    raise NotImplementedError


# 入力batchだけの概算メモリMiBを返す
def input_memory_mib(
    batch: int,
    channels: int,
    height: int,
    width: int,
    bytes_per_value: int = 4,
) -> float:
    # TODO: 要素数×bytesを1024^2で割る
    raise NotImplementedError
