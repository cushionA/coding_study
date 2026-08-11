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
    return HashingVectorizer(
        n_features=n_features,
        analyzer=analyzer,
        ngram_range=ngram_range,
        alternate_sign=False,
        norm="l2",
    )


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
    X = vectorizer.transform(docs)
    clf = SGDClassifier(
        loss="log_loss", alpha=alpha, max_iter=max_iter, random_state=random_state
    )
    clf.fit(X, labels)
    return clf


# 学習済みの分類器を docs / labels の組で採点する。
# 戻り値: {"accuracy": float, "macro_f1": float, "n_features": int}
# macro_f1 はクラスごとの F1 の単純平均で、クラスの件数が偏っていると accuracy とは一致しない。
# n_features はベクトル化した行列の「列数」(= 特徴量の次元)。
def evaluate_light_classifier(vectorizer: HashingVectorizer, clf, docs, labels) -> dict:
    X = vectorizer.transform(docs)
    pred = clf.predict(X)
    return {
        "accuracy": float(accuracy_score(labels, pred)),
        "macro_f1": float(f1_score(labels, pred, average="macro")),
        "n_features": int(X.shape[1]),
    }


# items の各要素に fn を適用し、スループット(件/秒)を float で返す。
# 「モデルを速くしても全体は速くならない」を言うためには、まずこれで各段を別々に測る。
def throughput(fn, items) -> float:
    items = list(items)
    t0 = time.perf_counter()
    for x in items:
        fn(x)
    elapsed = time.perf_counter() - t0
    return float(len(items) / elapsed)
