# ex01_blocking_and_pairs: 二乗個の全ペアを候補生成で減らす

from itertools import combinations
from collections.abc import Callable, Sequence


# 0..n-1の全ての順不同ペアを返す
def all_pairs(n: int) -> set[tuple[int, int]]:
    # TODO: 同じ要素同士や逆順重複を含めず組合せを作る
    raise NotImplementedError


# recordsの各blocking keyについて、同じ値を持つ行同士のペアを和集合で返す
# key_functionsは record -> hashable を返す関数のリスト
def blocking_pairs(
    records: Sequence[str], key_functions: Sequence[Callable[[str], object]]
) -> set[tuple[int, int]]:
    # TODO: keyごとにバケツを作り、各バケツ内の組合せを集合へ加える
    raise NotImplementedError


# 正解ペアのうち候補集合に残った割合を返す
def pair_recall(candidates: set[tuple[int, int]], true_pairs: set[tuple[int, int]]) -> float:
    # TODO: ペアの向きを正規化して集合の積から割合を求める
    raise NotImplementedError
