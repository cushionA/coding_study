# ex02_masking: ブールマスクによる抽出
# C#の arr.Where(x => x > 3).ToArray() に相当する処理を、
# NumPyでは「条件式が真偽値の配列(ブールマスク)を生み出し、それを添字に使う」ことで実現する。

import numpy as np


# 配列から threshold より大きい要素だけを抽出して返す
# (C#: arr.Where(x => x > threshold).ToArray())
def filter_greater_than(arr, threshold):
    return arr[arr > threshold]


# 配列の偶数要素だけを抽出して返す
def filter_even(arr):
    return arr[arr % 2 == 0]


# 条件を満たす要素を value で置き換えた「新しい」配列を返す(元の配列は変更しない)
# (C#: arr.Select(x => x < threshold ? value : x).ToArray())
def clip_below(arr, threshold, value):
    result = arr.copy()
    result[result < threshold] = value
    return result


# 条件を満たす要素の「個数」を返す
def count_matching(arr, threshold):
    return int((arr > threshold).sum())
