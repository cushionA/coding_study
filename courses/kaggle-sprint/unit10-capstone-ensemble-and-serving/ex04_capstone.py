"""ex04: 精度・速度・レイテンシ・費用を同じ契約で比較する。"""


def llm_monthly_cost(daily_items, input_tokens, output_tokens, input_per_million, output_per_million, days=30):
    """LLM APIの月額を入力/出力単価を分けて返す。"""
    # TODO: 1件費を日次件数と稼働日数へ展開する
    raise NotImplementedError


def self_hosted_estimate(daily_items, throughput_per_second, p95_latency_ms, cpu_hourly, gpu_hourly, training_hours, retrains_per_month, cpu_hours=730, days=30):
    """自前構成の月額・速度・レイテンシ・1000件費を返す。"""
    # TODO: GPU再学習とCPU稼働を合計し、月間件数あたり費用へ直す
    raise NotImplementedError


def break_even_daily_items(input_tokens, output_tokens, input_per_million, output_per_million, self_cost, days=30):
    """LLM月額がself_costと等しくなる1日件数を返す。"""
    # TODO: 1件費が0の境界を扱い、損益分岐を求める
    raise NotImplementedError


def choose_cheapest(configs, min_accuracy, max_p95_latency_ms):
    """精度とp95制約を満たす構成から月額最小を返す。"""
    # TODO: 品質・レイテンシの両制約で絞り、費用を比較する
    raise NotImplementedError
