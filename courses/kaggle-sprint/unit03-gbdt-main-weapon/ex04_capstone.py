# ex04_capstone: log価格のLightGBMベースラインを再利用できる部品にする

import numpy as np
import pandas as pd
import lightgbm as lgb
from lightgbm import LGBMRegressor


# log1p済みの目的変数で早期終了つきモデルを学習し、結果を辞書で返す
# キー: model, prediction_log, best_iteration, rmsle
def train_price_baseline(X_train, y_log_train, X_valid, y_log_valid, stopping_rounds=20):
    # TODO: LGBMRegressorを学習し、対数空間RMSEまで計算して辞書にまとめる
    raise NotImplementedError


# 対数価格の予測を元の価格へ戻し、負値を0に丸める
def to_price(prediction_log):
    # TODO: 対数変換を逆にたどり、価格として妥当な範囲へ戻す
    raise NotImplementedError


# 学習済みモデルから上位k件の特徴名を返す
def top_features(model, feature_names, k=5):
    # TODO: feature_importances_の降順インデックスを使う
    raise NotImplementedError
