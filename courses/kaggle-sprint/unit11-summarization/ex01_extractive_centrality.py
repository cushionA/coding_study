# ex01_extractive_centrality: 文類似度グラフから重要文を選ぶ

import re
import numpy as np


# 句点・感嘆符・疑問符・改行を境界に空でない文へ分ける
def split_sentences(text):
    # TODO: 区切り記号を文末に残しつつ分割し、空白を除く
    raise NotImplementedError


# 行ベクトルのコサイン類似度行列を返す
def cosine_matrix(vectors):
    # TODO: 行ごとにL2正規化し、転置との積を取る
    raise NotImplementedError


# 非負類似度行列上でPageRank風中心性をべき乗法で計算する
def sentence_centrality(similarity, damping=0.85, steps=100):
    # TODO: 対角を0にし行確率へ正規化、一定回数scoreを更新する
    raise NotImplementedError


# score上位n文を、原文での出現順へ戻して返す
def select_top_sentences(sentences, scores, n):
    # TODO: 上位indexを選んで昇順に戻す
    raise NotImplementedError
