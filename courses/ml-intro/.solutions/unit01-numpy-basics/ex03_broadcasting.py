# ex03_broadcasting: ブロードキャスト(形状の異なる配列同士の演算)
# C#では配列同士の演算をするとき次元やサイズを自分で揃えてループする必要があるが、
# NumPyは「小さい方の形状を自動で引き伸ばして」演算する。これがブロードキャスト。
# 例: shape (3,4) の行列 + shape (4,) の1次元配列 → 各行に同じベクトルが足される。

import numpy as np


# 2次元配列(行列)の各行に同じ1次元配列(ベクトル)を加算して返す
# matrix.shape = (rows, cols), vector.shape = (cols,)
def add_row_vector(matrix, vector):
    return matrix + vector


# 2次元配列の各行を、その行の合計で割って正規化(各行の合計が1になるようにする)
# ヒント: 行ごとの合計は axis=1 で計算し、そのままだと shape (rows,) になるため
# 割り算するには shape (rows, 1) に変形(reshape)する必要がある
def normalize_rows(matrix):
    row_sums = matrix.sum(axis=1, keepdims=True)
    return matrix / row_sums


# 2次元配列の各列から、その列の平均を引く(列ごとの中心化)
# C#で書くなら列ごとにループして平均を計算し引き算するところだが、ここでは axis=0 だけで済む
def center_columns(matrix):
    return matrix - matrix.mean(axis=0)
