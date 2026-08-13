# ex02_mmr_and_rouge: 関連性と多様性を両立し要約を評価する

from collections import Counter
from collections.abc import Sequence
import numpy as np


# relevanceと文間similarityからMMR順にindexを選ぶ
def mmr_select(
    relevance: np.ndarray, similarity: np.ndarray, n: int, lambda_weight: float = 0.7
) -> list[int]:
    # TODO: 未選択候補の関連度-既選択との最大類似度で貪欲選択する
    raise NotImplementedError


# token列のROUGE-N precision/recall/f1を返す
def rouge_n(
    candidate_tokens: Sequence[str], reference_tokens: Sequence[str], n: int = 1
) -> dict[str, float]:
    # TODO: n-gram Counterの重複数をmin countで数える
    raise NotImplementedError


# 2つのtoken列の最長共通部分列長をDPで返す
def lcs_length(left: Sequence[str], right: Sequence[str]) -> int:
    # TODO: 競プロで使う部分列DPを組み、最長の共通順序を返す
    raise NotImplementedError


# LCSに基づくprecision/recall/f1を返す
def rouge_l(
    candidate_tokens: Sequence[str], reference_tokens: Sequence[str]
) -> dict[str, float]:
    # TODO: LCS長をcandidate/reference長で割る
    raise NotImplementedError
