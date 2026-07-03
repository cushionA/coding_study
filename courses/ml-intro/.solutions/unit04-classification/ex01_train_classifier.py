# ex01_train_classifier: 分類モデルの学習・予測・正解率
# 回帰(unit03)は「予測値と正解の差の大きさ」を評価したが、分類は「クラスを当てたか外したか」で評価する。
# scikit-learnのAPIは回帰でも分類でも同じ形(fit→predict)。C#で言えば
# IPredictor<TIn, TOut> という共通インターフェースを、回帰用・分類用それぞれの実装クラスが満たすイメージ。

import numpy as np
from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


# load_iris() のデータを (X, y) に分割して返す
# X: 特徴量(花びら・がく片の長さ幅など)、y: 品種ラベル(0,1,2の3クラス)
def load_data():
    data = load_iris()
    return data.data, data.target


# X, y を学習用とテスト用に分割する
# test_size の割合をテスト用にする。random_state=42 で毎回同じ分割にする(再現性)
def split_data(X, y, test_size=0.2):
    return train_test_split(X, y, test_size=test_size, random_state=42)


# LogisticRegression を学習させて返す
# 収束警告が出ないよう max_iter を十分大きくする(デフォルトの100だとirisでも警告が出ることがある)
def train_classifier(X_train, y_train):
    model = LogisticRegression(max_iter=200)
    model.fit(X_train, y_train)
    return model


# 学習済みモデルの予測を正解率(accuracy)で評価する
# accuracy = 予測が正解と一致した割合。回帰のMAE/RMSEと違い「当たったか外れたか」の二値で数える
def evaluate_accuracy(model, X_test, y_test):
    y_pred = model.predict(X_test)
    return accuracy_score(y_test, y_pred)
