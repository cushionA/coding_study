# ex04_capstone: end-to-endの回帰パイプライン(ex01〜ex03の総合演習)
# 「データ読込 → 分割 → 学習 → 予測 → 評価 → 誤差分析」という、
# 実務で最初に書くことになる回帰モデルの一連の流れを1つにまとめる。
# C#で言えば、これまで個別に書いたメソッド(Repository取得・Split・Fit・Predict・Evaluate)を
# 呼び出す「サービス層のメソッド」を1本書くようなもの。

import numpy as np
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split


# データ読込からモデル学習までを一気に行い、
# (model, X_test, y_test) のタプルを返す
# train_test_split は test_size=0.2, random_state=42 で行う
def build_model():
    X, y = load_diabetes(return_X_y=True)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = LinearRegression()
    model.fit(X_train, y_train)
    return model, X_test, y_test


# 学習済みモデルとテストデータから、予測値の配列 preds を計算し、
# {"mae": ..., "r2": ...} の辞書で評価結果を返す
def evaluate_model(model, X_test, y_test):
    preds = model.predict(X_test)
    return {
        "mae": mean_absolute_error(y_test, preds),
        "r2": r2_score(y_test, preds),
    }


# 実測値と予測値の差(残差 = y_test - preds)の絶対値が最も大きい上位k件の
# インデックス配列を返す(誤差が大きい=モデルが苦手なサンプルを特定する処理)
# 返り値は残差の絶対値が大きい順に並んだ長さkのインデックス配列
def find_worst_predictions(y_test, preds, k=5):
    residuals = np.abs(y_test - preds)
    return np.argsort(residuals)[::-1][:k]


# build_model → evaluate_model → find_worst_predictions を順番に呼び出し、
# {"mae": ..., "r2": ..., "worst_indices": ...} の形の最終レポートを返す
# (このユニット全体の総まとめ。ここまでの3関数を組み合わせるだけで書ける)
def run_pipeline():
    model, X_test, y_test = build_model()
    metrics = evaluate_model(model, X_test, y_test)
    preds = model.predict(X_test)
    worst_indices = find_worst_predictions(y_test, preds, k=5)
    return {
        "mae": metrics["mae"],
        "r2": metrics["r2"],
        "worst_indices": worst_indices,
    }
