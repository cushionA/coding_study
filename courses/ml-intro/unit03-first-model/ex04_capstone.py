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
    # TODO: load_diabetes(return_X_y=True) → train_test_split → LinearRegression().fit() の順で組み立てる
    # (ex01のload_data/split_data/train_modelをここで組み合わせるイメージ)
    raise NotImplementedError


# 学習済みモデルとテストデータから、予測値の配列 preds を計算し、
# {"mae": ..., "r2": ...} の辞書で評価結果を返す
def evaluate_model(model, X_test, y_test):
    # TODO: 予測を出し、MAEとR2を計算して辞書にまとめる
    raise NotImplementedError


# 実測値と予測値の差(残差 = y_test - preds)の絶対値が最も大きい上位k件の
# インデックス配列を返す(誤差が大きい=モデルが苦手なサンプルを特定する処理)
# 返り値は残差の絶対値が大きい順に並んだ長さkのインデックス配列
def find_worst_predictions(y_test, preds, k=5):
    # TODO: residuals = y_test - preds を計算し、np.abs(residuals) の値が大きい順にk件のインデックスを取る
    # np.argsort は昇順に並べ替えたインデックスを返す。降順が欲しい場合の並べ替え方を考える
    raise NotImplementedError


# build_model → evaluate_model → find_worst_predictions を順番に呼び出し、
# {"mae": ..., "r2": ..., "worst_indices": ...} の形の最終レポートを返す
# (このユニット全体の総まとめ。ここまでの3関数を組み合わせるだけで書ける)
def run_pipeline():
    # TODO: 上の3つの関数を順に呼び出し、結果を1つの辞書にまとめて返す
    raise NotImplementedError
