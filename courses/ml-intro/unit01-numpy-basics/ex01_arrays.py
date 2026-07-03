# ex01_arrays: NumPy配列の基本操作
# C#の配列と違い、NumPy配列は全要素が同じ型で、演算子が全要素に一括適用される。
# ループを書かずに配列全体を操作する感覚を掴むのがこの課題の目的。

import numpy as np


# 1からnまでの整数配列を作って返す
# (C#: Enumerable.Range(1, n).ToArray() に相当)
def make_range(n):
    # TODO: 範囲から配列を作る(ループ不要。詰まったらヒント参照)
    raise NotImplementedError


# 配列の全要素を2倍して返す
# (C#: arr.Select(x => x * 2).ToArray() に相当するが、ループもLINQも不要)
def double_all(arr):
    # TODO: ループを書かずに全要素を2倍する
    raise NotImplementedError


# 配列の合計・平均・最大値をタプル (sum, mean, max) で返す
def summarize(arr):
    # TODO: 統計量ごとに専用の関数/メソッドがある。ループで自作しない
    raise NotImplementedError
