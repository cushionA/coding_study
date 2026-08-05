# ex01_split_fit_predict: train_test_split と estimator の基本サイクル
# scikit-learnのモデル(estimator)は「オブジェクトを生成 → fitで学習 → predictで推論」という
# 一貫したインターフェースを持つ。C#で言えば、全てのモデルクラスが
# 共通インターフェース(Fit/Predictメソッド)を実装しているようなもの。
# 呼び出し側はモデルの中身を知らなくても同じ手順で扱える(ポリモーフィズム)。

import numpy as np
from sklearn.datasets import load_diabetes
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split


# load_diabetes() で特徴量Xと目的変数yを取得して返す
# (C#: リポジトリからデータを取得する処理に相当。ここではsklearn組み込みなのでDB接続は不要)
def load_data() -> tuple[np.ndarray, np.ndarray]:
    # TODO: 特徴量Xと目的変数yをタプルで直接受け取れる読み込みオプションを使う(ヒント参照)
    raise NotImplementedError


# X, y を学習用とテスト用に分割して (X_train, X_test, y_train, y_test) を返す
# test_size=0.2, random_state=42 を必ず指定する(再現性のため)
def split_data(X: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    # TODO: train_test_split(X, y, test_size=..., random_state=...) を使う
    raise NotImplementedError


# LinearRegression のインスタンスを生成し、X_train, y_train で学習(fit)して、
# 学習済みモデルそのものを返す
# (C#: new LinearRegression() でインスタンス化し、Fit(...) を呼ぶイメージ)
def train_model(X_train: np.ndarray, y_train: np.ndarray) -> LinearRegression:
    # TODO: モデルを生成し、訓練データで学習させてから返す
    raise NotImplementedError


# 学習済みモデルで X_test に対する予測値を返す
# (C#: model.Predict(...) に相当。fitと違いpredictは何度呼んでもモデルを変更しない)
def predict(model: LinearRegression, X_test: np.ndarray) -> np.ndarray:
    # TODO: 学習済みモデルにテストデータを予測させる
    raise NotImplementedError
