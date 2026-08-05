# ex03_train_evaluate: 分類モデルの学習と評価(unit03・unit04の統合)
# 前処理済みデータに対して、estimatorオブジェクトを生成→fit→predictという
# 一貫した流れ(C#のインターフェース実装のアナロジー)を、評価指標の算出までつなげる。

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix


# LogisticRegressionを学習データにfitさせて返す(学習済みモデル)
# max_iter はデフォルトだと収束しないことがあるので大きめの値を渡す
def train_classifier(X_train: np.ndarray, y_train: np.ndarray, random_state: int = 0) -> LogisticRegression:
    # TODO: ロジスティック回帰のインスタンスを作り、学習データでfitしてから返す(ヒント参照)
    raise NotImplementedError


# 学習済みモデルでテストデータを予測し、正解率(accuracy)を返す
def evaluate_accuracy(model: LogisticRegression, X_test: np.ndarray, y_test: np.ndarray) -> float:
    # TODO: テストデータを予測し、正解率を計算して返す(ヒント参照)
    raise NotImplementedError


# 学習済みモデルでテストデータを予測し、混同行列(confusion matrix)を返す
def evaluate_confusion_matrix(model: LogisticRegression, X_test: np.ndarray, y_test: np.ndarray) -> np.ndarray:
    # TODO: テストデータを予測し、混同行列を計算して返す(ヒント参照)
    raise NotImplementedError
