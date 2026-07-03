# ex02_confusion_matrix: 混同行列と適合率・再現率
# accuracyは「全体の正解率」しか教えてくれない。混同行列は「どのクラスをどのクラスと間違えたか」まで見せる。
# C#で言えば、テスト結果を Pass/Fail の1ビットで見るか、期待値×実測値のクロス集計表で見るかの違い。

import numpy as np
from sklearn.datasets import load_wine
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, precision_score, recall_score, classification_report


# load_wine() のデータを学習用・テスト用に分割し、学習済みモデルと共に返す
# (X_train, X_test, y_train, y_test, model) の5点セット
def prepare_and_train():
    data = load_wine()
    X_train, X_test, y_train, y_test = train_test_split(
        data.data, data.target, test_size=0.2, random_state=42
    )
    model = LogisticRegression(max_iter=5000)
    model.fit(X_train, y_train)
    return X_train, X_test, y_train, y_test, model


# 予測結果の混同行列を返す
# 行=正解ラベル、列=予測ラベル。対角線が「当たった数」、それ以外が「取り違えた数」
def get_confusion_matrix(model, X_test, y_test):
    y_pred = model.predict(X_test)
    return confusion_matrix(y_test, y_pred)


# 予測結果の適合率(precision)・再現率(recall)をクラスごとの平均(macro)で返す (precision, recall)
# precision: 「陽性と予測した中で実際に陽性だった割合」
# recall: 「実際に陽性のもののうち陽性と予測できた割合」
def get_precision_recall(model, X_test, y_test):
    y_pred = model.predict(X_test)
    precision = precision_score(y_test, y_pred, average="macro")
    recall = recall_score(y_test, y_pred, average="macro")
    return precision, recall


# 分類レポート(クラスごとのprecision/recall/f1をまとめた文字列)を返す
def get_classification_report(model, X_test, y_test):
    y_pred = model.predict(X_test)
    return classification_report(y_test, y_pred)
