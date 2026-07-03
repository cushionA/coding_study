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
    X_single = X[:, [feature_index]]
    X_train, X_test, y_train, y_test = train_test_split(
        X_single, y, test_size=0.2, random_state=42
    )
    model = LinearRegression()
    model.fit(X_train, y_train)
    return model, X_test, y_test


# 全10特徴量を使ってLinearRegressionを学習し、(model, X_test, y_test) を返す
# train_test_split は test_size=0.2, random_state=42 で行う
def fit_all_features():
    X, y = load_diabetes(return_X_y=True)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = LinearRegression()
    model.fit(X_train, y_train)
    return model, X_test, y_test


# 学習済みモデルの係数(coef_)から、絶対値が最大の特徴量のインデックスを返す
# 「どの特徴量が予測に最も強く影響しているか」を確認する処理
def most_influential_feature(model):
    return int(np.argmax(np.abs(model.coef_)))


# 学習済みモデルと (X_test, y_test) を受け取り、テストデータでのR2スコアを返す
def score_on_test(model, X_test, y_test):
    preds = model.predict(X_test)
    return r2_score(y_test, preds)
