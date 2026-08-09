# ex03_linear_baseline: 疎TF-IDFを線形分類器へ渡して評価する

import numpy as np
from sklearn.metrics import f1_score
from sklearn.svm import LinearSVC


# 不均衡を考慮したLinearSVCを学習して返す
def fit_linear_svc(X_train, y_train, C=1.0):
    # TODO: class_weightとrandom_stateを指定してfitする
    raise NotImplementedError


# macro-F1とmicro-F1を辞書で返す
def f1_summary(y_true, y_pred):
    # TODO: f1_scoreのaverageを2通り使う
    raise NotImplementedError


# 多クラスLinearSVCで指定クラスを強く示す上位語を返す
def top_terms_for_class(model, feature_names, class_label, n=5):
    # TODO: classes_から行位置を求め、coef_の大きい語を選ぶ
    raise NotImplementedError
