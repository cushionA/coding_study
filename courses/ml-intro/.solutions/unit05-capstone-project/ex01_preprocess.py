# ex01_preprocess: 欠損値の注入と補完(unit02の欠損処理の復習+実践)
# 実データは欠損だらけだが、scikit-learnの組み込みデータセットは綺麗すぎる。
# ここではload_wineに人為的に欠損を注入し、SimpleImputerで補完する練習をする。

import numpy as np
from sklearn.datasets import load_wine
from sklearn.impute import SimpleImputer


# load_wine の特徴量(X)を2次元NumPy配列として返す
# (C#: 組み込みの「データセット取得API」を呼ぶだけでDBやCSVが不要、という感覚に近い)
def load_features():
    X, _ = load_wine(return_X_y=True)
    return X


# 特徴量配列Xの一部をランダムに欠損(np.nan)にして返す(元の配列は変更しない)
# np.random.default_rng(seed) で生成器を作り、generator.random(X.shape) で
# 0〜1の一様乱数配列を作る。その値が missing_rate 未満のセルを欠損にする
def inject_missing(X, missing_rate=0.1, seed=0):
    X_missing = X.copy().astype(float)
    rng = np.random.default_rng(seed)
    mask = rng.random(X.shape) < missing_rate
    X_missing[mask] = np.nan
    return X_missing


# 欠損を含む特徴量配列を、列(特徴量)ごとの平均値で補完して返す
# SimpleImputer(strategy="mean") を fit_transform するだけでよい
def impute_mean(X_missing):
    imputer = SimpleImputer(strategy="mean")
    return imputer.fit_transform(X_missing)
