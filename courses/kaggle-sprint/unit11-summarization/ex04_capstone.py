# ex04_capstone: 要約の事実性・生成コスト・方式選択を数値化する

import re
from collections.abc import Mapping, Sequence
from typing import Any


# 数値・英数字型番を事実token集合として抽出する
def extract_facts(text: str) -> set[str]:
    # TODO: 数字を含む英数字/ハイフン列を正規表現で取り出し大文字化する
    raise NotImplementedError


# 要約中factのうち原文に無い割合を返す
def hallucination_rate(source: str, summary: str) -> float:
    # TODO: fact集合差をsummary fact数で割る。fact0件は0
    raise NotImplementedError


# 自己回帰生成の相対work = 件数×出力token×beam幅×(入力+平均生成済み長)
def generation_work(
    n_items: int, input_tokens: int, output_tokens: int, beam_width: int = 1
) -> int:
    # TODO: 自己回帰で伸びるprefix長を平均化し、件数とbeam幅へ展開する
    raise NotImplementedError


# quality/factuality制約を満たす候補からcost最小のdictを返す
def choose_summarizer(
    options: Sequence[Mapping[str, Any]], min_quality: float, min_factuality: float
) -> Mapping[str, Any]:
    # TODO: 2条件で絞りcost最小を選ぶ。無ければValueError
    raise NotImplementedError
