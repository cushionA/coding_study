# ex03_broadcasting: ブロードキャスト(形状の異なる配列同士の演算)
# C#では配列同士の演算をするとき次元やサイズを自分で揃えてループする必要があるが、
# NumPyは「小さい方の形状を自動で引き伸ばして」演算する。これがブロードキャスト。
# 例: shape (3,4) の行列 + shape (4,) の1次元配列 → 各行に同じベクトルが足される。

import numpy as np


# 2次元配列(行列)の各行に同じ1次元配列(ベクトル)を加算して返す
# matrix.shape = (rows, cols), vector.shape = (cols,)
def add_row_vector(matrix, vector):
    # TODO: ブロードキャストに任せればループは不要
    raise NotImplementedError


# 2次元配列の各行を、その行の合計で割って正規化(各行の合計が1になるようにする)
def normalize_rows(matrix):
    # TODO: 行ごとの合計を計算し、割り算がブロードキャストできる形状かに注意する
    raise NotImplementedError


# 2次元配列の各列から、その列の平均を引く(列ごとの中心化)
# C#で書くなら列ごとにループして平均を計算し引き算するところ
def center_columns(matrix):
    # TODO: 列ごとの平均を計算して引く。どの軸(axis)かを考える
    raise NotImplementedError
