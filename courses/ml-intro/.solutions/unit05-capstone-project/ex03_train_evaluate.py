# ex03_train_evaluate: 分類モデルの学習と評価(unit03・unit04の統合)
# 前処理済みデータに対して、estimatorオブジェクトを生成→fit→predictという
# 一貫した流れ(C#のインターフェース実装のアナロジー)を、評価指標の算出までつなげる。

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix


# LogisticRegressionを学習データにfitさせて返す(学習済みモデル)
# max_iter はデフォルトだと収束しないことがあるので大きめの値を渡す
def train_classifier(X_train, y_train, random_state=0):
    model = LogisticRegression(max_iter=1000, random_state=random_state)
    model.fit(X_train, y_train)
    return model


# 学習済みモデルでテストデータを予測し、正解率(accuracy)を返す
def evaluate_accuracy(model, X_test, y_test):
    y_pred = model.predict(X_test)
    return accuracy_score(y_test, y_pred)


# 学習済みモデルでテストデータを予測し、混同行列(confusion matrix)を返す
def evaluate_confusion_matrix(model, X_test, y_test):
    y_pred = model.predict(X_test)
    return confusion_matrix(y_test, y_pred)
