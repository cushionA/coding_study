# ex02_stacking_and_seed_average: ばらつきとモデル間の補完関係を使う

import numpy as np
from sklearn.linear_model import Ridge


# 同一モデルのseed違い予測を平均する
def seed_average(predictions):
    # TODO: 同shape配列をstackしseed軸でmeanする
    raise NotImplementedError


# モデル予測列同士の相関行列を返す
def prediction_correlation(oof_matrix):
    # TODO: 列を変数としてcorrcoefを計算する
    raise NotImplementedError


# OOF列を特徴としてRidgeメタモデルを学習する
def fit_stacking_meta(oof_matrix, y_true, alpha=1.0):
    # TODO: Ridgeをfitして返す
    raise NotImplementedError


# 学習済みメタモデルでtest予測列をstackingする
def predict_stacking(meta_model, test_prediction_matrix):
    # TODO: predict結果を1次元float配列で返す
    raise NotImplementedError
