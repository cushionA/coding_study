# ex04_capstone: log価格のLightGBMベースラインを再利用できる部品にする

import numpy as np
import pandas as pd
import lightgbm as lgb
from lightgbm import LGBMRegressor
from collections.abc import Sequence
from typing import Any


# log1p済みの目的変数で早期終了つきモデルを学習し、結果を辞書で返す
# キー: model, prediction_log, best_iteration, rmsle
def train_price_baseline(
    X_train: object,
    y_log_train: np.ndarray,
    X_valid: object,
    y_log_valid: np.ndarray,
    stopping_rounds: int = 20,
) -> dict[str, Any]:
    # TODO: LGBMRegressorを学習し、対数空間RMSEまで計算して辞書にまとめる
    raise NotImplementedError


# 対数価格の予測を元の価格へ戻し、負値を0に丸める
def to_price(prediction_log: np.ndarray) -> np.ndarray:
    # TODO: 対数変換を逆にたどり、価格として妥当な範囲へ戻す
    raise NotImplementedError


# 学習済みモデルから上位k件の特徴名を返す
def top_features(model: LGBMRegressor, feature_names: Sequence[str], k: int = 5) -> list[str]:
    # TODO: feature_importances_の降順インデックスを使う
    raise NotImplementedError
