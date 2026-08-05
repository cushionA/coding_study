# ex01_preprocess: 欠損値の注入と補完(unit02の欠損処理の復習+実践)
# 実データは欠損だらけだが、scikit-learnの組み込みデータセットは綺麗すぎる。
# ここではload_wineに人為的に欠損を注入し、SimpleImputerで補完する練習をする。

import numpy as np
from sklearn.datasets import load_wine
from sklearn.impute import SimpleImputer


# load_wine の特徴量(X)を2次元NumPy配列として返す
# (C#: 組み込みの「データセット取得API」を呼ぶだけでDBやCSVが不要、という感覚に近い)
def load_features() -> tuple[np.ndarray, np.ndarray]:
    # TODO: load_wineからXとyを取得し、Xだけを返す(ヒント参照)
    raise NotImplementedError


# 特徴量配列Xの一部をランダムに欠損(np.nan)にして返す(元の配列は変更しない)
# np.random.default_rng(seed) で生成器を作り、generator.random(X.shape) で
# 0〜1の一様乱数配列を作る。その値が missing_rate 未満のセルを欠損にする
def inject_missing(X: np.ndarray, missing_rate: float = 0.1, seed: int = 0) -> np.ndarray:
    # TODO: 配列を複製し、乱数マスクで対象セルをnp.nanにする(ヒント参照)
    raise NotImplementedError


# 欠損を含む特徴量配列を、列(特徴量)ごとの平均値で補完して返す
# SimpleImputer(strategy="mean") を fit_transform するだけでよい
def impute_mean(X_missing: np.ndarray) -> np.ndarray:
    # TODO: 平均値補完のインスタンスを作り、Xを補完した結果を返す(ヒント参照)
    raise NotImplementedError
