# ex04_capstone: 読込→前処理→分割→学習→評価を一人で通す(unit01〜04の総合演習)
# ex01〜ex03で個別に書いた処理を、1つのエンドツーエンドの流れにまとめる。
# load_breast_cancer で今まで扱っていない新しいデータセットに対して同じ手順を適用できるかを確認する。

import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# load_breast_cancer を読み込み、(X, y) のタプルを返す
def load_data():
    return load_breast_cancer(return_X_y=True)


# 特徴量Xの一部にシード固定の合成欠損を注入して返す(元の配列は変更しない)
# ex01のinject_missingと同じ考え方: rng.random(X.shape) < missing_rate のセルをnp.nanにする
def add_synthetic_missing(X, missing_rate=0.05, seed=0):
    X_missing = X.copy().astype(float)
    rng = np.random.default_rng(seed)
    mask = rng.random(X.shape) < missing_rate
    X_missing[mask] = np.nan
    return X_missing


# 「欠損補完→標準化」のPipelineを構築して返す(ex02と同じ構成)
def build_pipeline():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="mean")),
        ("scaler", StandardScaler()),
    ])


# 欠損入りの特徴量Xと正解ラベルyを受け取り、
# 1) 学習/テストに分割 2) Pipelineで前処理 3) LogisticRegressionで学習 4) テストデータの正解率を計算
# して、(学習済みモデル, テスト正解率) のタプルを返す
# ここまでの関数(load_data, build_pipelineなど)を組み合わせるだけで書ける
def run_end_to_end(X, y, test_size=0.2, random_state=0):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    pipeline = build_pipeline()
    X_train_t = pipeline.fit_transform(X_train)
    X_test_t = pipeline.transform(X_test)

    model = LogisticRegression(max_iter=1000, random_state=random_state)
    model.fit(X_train_t, y_train)

    accuracy = accuracy_score(y_test, model.predict(X_test_t))
    return model, accuracy
