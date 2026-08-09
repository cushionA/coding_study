# ex03_cosine_and_pooling: 疎・密ベクトルの向きとmask付き文集約を扱う

import numpy as np


# 2本のベクトルのコサイン類似度を返す
def cosine_similarity(left, right):
    # TODO: 内積をノルムの積で割り、ゼロベクトルを安全に扱う
    raise NotImplementedError


# 行ベクトル群をL2正規化してコサイン類似度行列を返す
def pairwise_cosine(matrix):
    # TODO: 行ごとのノルムをkeepdimsで求め、正規化行列の積を取る
    raise NotImplementedError


# token_embeddings(batch, seq, dim)をattention_mask(batch, seq)でmean poolingする
def masked_mean_pooling(token_embeddings, attention_mask):
    # TODO: maskに末尾軸を足し、paddingを除く分子と分母を作る
    raise NotImplementedError
