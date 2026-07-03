# ex03_cross_validation: K分割交差検証
# train_test_splitは「1回だけ」データを分けるので、たまたま簡単な(または難しい)テストになる運が絡む。
# 交差検証はデータをK個に分け、K回「1個をテスト・残りを学習」に使い回して平均を取る。
# C#のテストで言えば、1つのテストケースだけでなく複数のテストケース(分割パターン)で平均点を見るイメージ。

import numpy as np
from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, KFold


# load_iris() の (X, y) を返す
def load_data():
    # TODO: ex01と同じ要領。load_iris() の .data, .target を返す
    raise NotImplementedError


# 5分割交差検証のaccuracyスコア配列(長さ5)を返す
# cv=5 を渡すと内部で自動的に5分割してくれる
def cross_validate(X, y, cv=5):
    # TODO: 未学習の分類モデルを作り、K分割交差検証を1関数で行ってスコア配列を返す(ヒント参照)
    raise NotImplementedError


# 交差検証スコアの平均と標準偏差を (mean, std) で返す
# 平均は「典型的な性能」、標準偏差は「分割によるブレの大きさ」を表す
def summarize_scores(scores):
    # TODO: 配列の平均とばらつきを表す統計量をそれぞれ求めてタプルで返す(ヒント参照)
    raise NotImplementedError


# KFold(shuffle=True, random_state=42) で分割したときの交差検証スコア配列を返す
# cross_val_score の cv 引数には整数の代わりに分割器オブジェクトを渡せる
def cross_validate_shuffled(X, y, n_splits=5):
    # TODO: シャッフルする分割器オブジェクトを作り、それを使って交差検証を行う(ヒント参照)
    raise NotImplementedError
