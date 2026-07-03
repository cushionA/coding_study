# ex02_metrics: 回帰指標(MAE / MSE / RMSE / R2)
# 分類なら「正解率」で一言で済むが、回帰は「どれだけズレたか」を測るので指標が複数ある。
# C#で例えるなら、Equals()の代わりに「距離」を測る複数のComparerを使い分けるイメージ。
# MAE: 誤差の絶対値の平均(単位はyと同じで直感的)
# MSE: 誤差の2乗の平均(大きな誤差をより強く罰する)
# RMSE: MSEの平方根(単位をyと揃え戻したもの)
# R2: モデルがyのばらつきをどれだけ説明できたか(1に近いほど良い、0は「平均を予測するだけ」と同等)

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# 平均絶対誤差(MAE)を返す
def compute_mae(y_true, y_pred):
    # TODO: 誤差の絶対値の平均を返す専用関数がある(ヒント参照)
    raise NotImplementedError


# 平均二乗誤差(MSE)を返す
def compute_mse(y_true, y_pred):
    # TODO: 誤差の2乗の平均を返す専用関数がある(ヒント参照)
    raise NotImplementedError


# 二乗平均平方根誤差(RMSE)を返す
# scikit-learnのバージョンによって mean_squared_error に squared 引数が無いこともあるため、
# ここでは MSE の平方根を自分で計算する
def compute_rmse(y_true, y_pred):
    # TODO: compute_mse をそのまま使い、np.sqrt で平方根を取る(関数の再利用)
    raise NotImplementedError


# 決定係数(R2)を返す
def compute_r2(y_true, y_pred):
    # TODO: 決定係数を返す専用関数がある(ヒント参照)
    raise NotImplementedError


# 4つの指標をまとめて辞書 {"mae": ..., "mse": ..., "rmse": ..., "r2": ...} で返す
def evaluate_all(y_true, y_pred):
    # TODO: 上の4つの関数を呼び出して辞書にまとめる
    raise NotImplementedError
