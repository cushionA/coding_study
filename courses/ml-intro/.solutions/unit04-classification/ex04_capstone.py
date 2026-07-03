# ex04_capstone: 分類の一連の流れ(ex01〜ex03の総合演習)
# 「データ読込→分割→学習→交差検証→混同行列で誤りを見る」という、分類タスクの標準フローを一人で組む。
# C#で言えば、これまでバラバラに書いた部品(データ取得・学習・評価)を1つのパイプラインとして繋ぐ回。

import numpy as np
from sklearn.datasets import load_wine
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, confusion_matrix


# load_wine() のデータを学習用・テスト用に分割して返す
# (X_train, X_test, y_train, y_test)。test_size=0.2, random_state=42
def load_and_split():
    data = load_wine()
    return train_test_split(data.data, data.target, test_size=0.2, random_state=42)


# LogisticRegression を学習させ、テストaccuracyと共に返す (model, accuracy)
def train_and_score(X_train, X_test, y_train, y_test):
    model = LogisticRegression(max_iter=5000)
    model.fit(X_train, y_train)
    accuracy = accuracy_score(y_test, model.predict(X_test))
    return model, accuracy


# 学習前のX, y全体に対して5分割交差検証を行い、平均accuracyを返す
# 「テスト分割1回だけの結果」と「交差検証の平均」を見比べるための関数
def cross_validated_accuracy(X, y, cv=5):
    model = LogisticRegression(max_iter=5000)
    return cross_val_score(model, X, y, cv=cv).mean()


# モデルとテストデータから混同行列を作り、最も取り違えの多いクラスペア (真のラベル, 予測ラベル, 件数) を返す
# 対角線(正解)は除外して探す
def most_confused_pair(model, X_test, y_test):
    cm = confusion_matrix(y_test, model.predict(X_test))
    off_diagonal = cm.copy()
    np.fill_diagonal(off_diagonal, 0)
    row, col = np.unravel_index(np.argmax(off_diagonal), off_diagonal.shape)
    return int(row), int(col), int(off_diagonal[row, col])
