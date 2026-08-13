"""ex04: 精度・速度・レイテンシ・費用を同じ契約で比較する。"""


from collections.abc import Mapping, Sequence
from typing import Any


def llm_monthly_cost(
    daily_items: int,
    input_tokens: int,
    output_tokens: int,
    input_per_million: float,
    output_per_million: float,
    days: int = 30,
) -> float:
    """LLM APIの月額を入力/出力単価を分けて返す。"""
    # TODO: 1件費を日次件数と稼働日数へ展開する
    raise NotImplementedError


def self_hosted_estimate(
    daily_items: int,
    throughput_per_second: float,
    p95_latency_ms: float,
    cpu_hourly: float,
    gpu_hourly: float,
    training_hours: float,
    retrains_per_month: int,
    cpu_hours: float = 730,
    days: int = 30,
) -> dict[str, float]:
    """自前構成の月額・速度・レイテンシ・1000件費を返す。"""
    # TODO: GPU再学習とCPU稼働を合計し、月間件数あたり費用へ直す
    raise NotImplementedError


def break_even_daily_items(
    input_tokens: int,
    output_tokens: int,
    input_per_million: float,
    output_per_million: float,
    self_cost: float,
    days: int = 30,
) -> float:
    """LLM月額がself_costと等しくなる1日件数を返す。"""
    # TODO: 1件費が0の境界を扱い、損益分岐を求める
    raise NotImplementedError


def choose_cheapest(
    configs: Sequence[Mapping[str, Any]], min_accuracy: float, max_p95_latency_ms: float
) -> Mapping[str, Any]:
    """精度とp95制約を満たす構成から月額最小を返す。"""
    # TODO: 品質・レイテンシの両制約で絞り、費用を比較する
    raise NotImplementedError
