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
    # TODO: load_breast_cancerを読み込み、(X, y)をそのまま返す(ヒント参照)
    raise NotImplementedError


# 特徴量Xの一部にシード固定の合成欠損を注入して返す(元の配列は変更しない)
# ex01のinject_missingと同じ考え方: rng.random(X.shape) < missing_rate のセルをnp.nanにする
def add_synthetic_missing(X, missing_rate=0.05, seed=0):
    # TODO: 配列を複製し、乱数マスクで一部をnp.nanにする(ヒント参照)
    raise NotImplementedError


# 「欠損補完→標準化」のPipelineを構築して返す(ex02と同じ構成)
def build_pipeline():
    # TODO: 補完器とスケーラーを2ステップで並べたPipelineを作って返す(ヒント参照)
    raise NotImplementedError


# 欠損入りの特徴量Xと正解ラベルyを受け取り、
# 1) 学習/テストに分割 2) Pipelineで前処理 3) LogisticRegressionで学習 4) テストデータの正解率を計算
# して、(学習済みモデル, テスト正解率) のタプルを返す
# ここまでの関数(load_data, build_pipelineなど)を組み合わせるだけで書ける
def run_end_to_end(X, y, test_size=0.2, random_state=0):
    # TODO:
    # 1. 学習用/テスト用に分割する
    # 2. Pipelineで前処理を行う(学習データはfit、テストデータはtransformのみ)
    # 3. ロジスティック回帰を学習データで学習する
    # 4. テストデータで正解率を計算する
    # 5. (model, accuracy) を返す
    raise NotImplementedError
