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
def load_and_split() -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    # TODO: wineデータを読み込み、学習用・テスト用に分割する(ex01/ex02と同じ要領。ヒント参照)
    raise NotImplementedError


# LogisticRegression を学習させ、テストaccuracyと共に返す (model, accuracy)
def train_and_score(X_train: np.ndarray, X_test: np.ndarray, y_train: np.ndarray, y_test: np.ndarray) -> tuple[LogisticRegression, float]:
    # TODO: モデルを学習させ、テストデータへの正解率を計算して (model, accuracy) を返す(ヒント参照)
    raise NotImplementedError


# 学習前のX, y全体に対して5分割交差検証を行い、平均accuracyを返す
# 「テスト分割1回だけの結果」と「交差検証の平均」を見比べるための関数
def cross_validated_accuracy(X: np.ndarray, y: np.ndarray, cv: int = 5) -> float:
    # TODO: 未学習のモデルを作り、交差検証で得たスコアの平均を返す(ex03参照)
    raise NotImplementedError


# モデルとテストデータから混同行列を作り、最も取り違えの多いクラスペア (真のラベル, 予測ラベル, 件数) を返す
# 対角線(正解)は除外して探す
def most_confused_pair(model: LogisticRegression, X_test: np.ndarray, y_test: np.ndarray) -> tuple[int, int, int]:
    # TODO: 混同行列を作り、対角線を除外した上で最も件数の多い取り違えペアの位置と件数を求める(ヒント参照)
    raise NotImplementedError
