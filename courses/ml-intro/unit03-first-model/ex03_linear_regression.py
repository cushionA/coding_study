# ex03_linear_regression: LinearRegressionの中身と特徴量の効き方
# LinearRegressionは「学習」で終わりではなく、学習後のモデルが自身の内部状態
# (係数 coef_ と切片 intercept_)を保持し続ける。C#のオブジェクトがフィールドに
# 状態を持つのと同じで、fit() はそのフィールドを書き換える副作用を持つメソッドと考えられる。
# 予測式は y = intercept_ + coef_[0]*x0 + coef_[1]*x1 + ... という単純な線形結合。

import numpy as np
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split


# 特徴量1つ(feature_index列目)だけを使ってLinearRegressionを学習し、
# 学習済みモデルと (X_test, y_test) をタプル (model, X_test, y_test) で返す
# train_test_split は test_size=0.2, random_state=42 で行う
def fit_single_feature(feature_index):
    X, y = load_diabetes(return_X_y=True)
    # TODO: 1列だけ取り出す。ただしモデルは2次元の形を要求する点に注意
    # TODO: train_test_split → LinearRegression().fit() の順で学習し、(model, X_test, y_test) を返す
    raise NotImplementedError


# 全10特徴量を使ってLinearRegressionを学習し、(model, X_test, y_test) を返す
# train_test_split は test_size=0.2, random_state=42 で行う
def fit_all_features():
    X, y = load_diabetes(return_X_y=True)
    # TODO: ex01と同じ手順(全特徴量を使う点だけが違う)
    raise NotImplementedError


# 学習済みモデルの係数(coef_)から、絶対値が最大の特徴量のインデックスを返す
# 「どの特徴量が予測に最も強く影響しているか」を確認する処理
def most_influential_feature(model):
    # TODO: 係数の絶対値が最大の位置を探す(ヒント参照)
    raise NotImplementedError


# 学習済みモデルと (X_test, y_test) を受け取り、テストデータでのR2スコアを返す
def score_on_test(model, X_test, y_test):
    # TODO: テストデータで予測し、決定係数を計算する
    # (LinearRegressionには model.score(X, y) というR2を直接返すメソッドもあるが、
    #  ここではex02で学んだ指標との繋がりを意識してpredict+評価関数で書く)
    raise NotImplementedError
