from conftest import load_exercise
import pytest

ex = load_exercise("ex04_capstone")


# 入力と出力の異なるトークン単価を月間件数へ正しく展開する。
def test_llm_monthly_cost_separate_prices():
    assert ex.llm_monthly_cost(1000, 500, 100, 2.0, 6.0, 30) == pytest.approx(48.0)


# 自前推論の月額・throughput・p95・1000件費を同じ見積りで返す。
def test_self_hosted_estimate_contract():
    result = ex.self_hosted_estimate(1000, 50, 40, 0.1, 3.0, 4, 2, 730, 30)
    assert result["monthly_cost"] == 97.0
    assert result["throughput_per_second"] == 50
    assert result["p95_latency_ms"] == 40
    assert result["cost_per_1000"] == pytest.approx(97 / 30)
    assert result["inference_hours"] == pytest.approx(1 / 6)


# API費と自前月額の損益分岐を元の費用式へ戻して確認する。
def test_break_even_round_trip():
    daily = ex.break_even_daily_items(500, 100, 2.0, 6.0, 48.0, 30)
    assert daily == pytest.approx(1000.0)


# 精度とp95の両方を満たす候補だけから最安構成を選ぶ。
def test_choose_cheapest_two_constraints():
    configs = [
        {"name": "slow", "accuracy": 0.95, "p95_latency_ms": 180, "monthly_cost": 10},
        {"name": "balanced", "accuracy": 0.91, "p95_latency_ms": 70, "monthly_cost": 30},
        {"name": "fast", "accuracy": 0.93, "p95_latency_ms": 40, "monthly_cost": 100},
    ]
    assert ex.choose_cheapest(configs, 0.90, 100)["name"] == "balanced"
    with pytest.raises(ValueError):
        ex.choose_cheapest(configs, 0.99, 20)
