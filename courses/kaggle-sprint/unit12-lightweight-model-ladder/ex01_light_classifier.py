# ex01_light_classifier: 段2(ハッシュ n-gram + 線形分類器)を使い回せる部品にする
# lesson では unit05 の商品テキストに対して、その場で HashingVectorizer と SGDClassifier を
# 並べて accuracy と macro-F1 を出した。ここでは同じ段を「どんなテキストとラベルにも効く関数」
# として部品化し、さらに「手を入れる前にまず測る」ためのスループット測定を足す。
# unit12 の判断(どの段で止めるか)は、精度と件/秒 の2つが揃って初めてできる。

import time

import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score, f1_score


# ハッシュ n-gram のベクトル化器を作って返す。
# 語彙表を持たないので fit は不要(transform だけで動く)のが段2の要点。
# 仕様: 出力の次元は n_features、n-gram の範囲は ngram_range、分割の単位は analyzer に従う。
#       衝突を打ち消すための符号の交互付与は行わない(非負の特徴量にする)。
#       各行は L2 ノルムが 1 になるように正規化する。
def build_vectorizer(
    n_features: int,
    analyzer: str = "word",
    ngram_range: tuple[int, int] = (1, 2),
) -> HashingVectorizer:
    # TODO: 上の仕様どおりのベクトル化器を1つ作って返す(設定は全部で4つ)
    raise NotImplementedError


# docs(テキストの列)と labels から線形分類器を学習して返す。
# 仕様: 損失は対数損失(ロジスティック回帰と同じ確率的な損失)。
#       alpha / max_iter / random_state は引数の値をそのまま分類器に渡す。
def fit_light_classifier(
    vectorizer: HashingVectorizer,
    docs,
    labels,
    alpha: float = 1e-6,
    max_iter: int = 30,
    random_state: int = 0,
) -> SGDClassifier:
    # TODO: docs をベクトル化してから分類器を学習させ、学習済みの分類器を返す
    raise NotImplementedError


# 学習済みの分類器を docs / labels の組で採点する。
# 戻り値: {"accuracy": float, "macro_f1": float, "n_features": int}
# macro_f1 はクラスごとの F1 の単純平均で、クラスの件数が偏っていると accuracy とは一致しない。
# n_features はベクトル化した行列の「列数」(= 特徴量の次元)。
def evaluate_light_classifier(vectorizer: HashingVectorizer, clf, docs, labels) -> dict:
    # TODO: docs をベクトル化 → 予測 → 2つの指標を計算して辞書で返す。
    #       次元は行列の shape のどちらの要素かを確かめてから取り出すこと
    raise NotImplementedError


# items の各要素に fn を適用し、スループット(件/秒)を float で返す。
# 「モデルを速くしても全体は速くならない」を言うためには、まずこれで各段を別々に測る。
def throughput(fn, items) -> float:
    # TODO: 処理の前後で時刻を取り、件数を経過秒で割った値を返す
    raise NotImplementedError
