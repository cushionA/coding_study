# ex01_estimator_api: scikit-learnの共通インターフェースでモデルを差し替える

import numpy as np
from sklearn.base import clone


# 元のestimatorを壊さず複製し、学習して予測する
# 戻り値: (学習済みestimator, 予測配列)
def fit_and_predict(estimator, X_train, y_train, X_valid):
    # TODO: estimatorを複製してfitし、validをpredictする
    raise NotImplementedError


# 候補パラメータを1つずつ試し、評価関数の値を辞書で返す
# scorerの引数は (y_true, y_pred)
def compare_parameter(estimator, param_name, values, X_train, y_train, X_valid, y_valid, scorer):
    # TODO: 各値をset_paramsした複製モデルで学習・予測・採点する
    raise NotImplementedError
