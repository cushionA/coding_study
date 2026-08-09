def llm_monthly_cost(daily_items, input_tokens, output_tokens, input_per_million, output_per_million, days=30):
    per_item = input_tokens * input_per_million / 1_000_000 + output_tokens * output_per_million / 1_000_000
    return daily_items * days * per_item


def self_hosted_estimate(daily_items, throughput_per_second, p95_latency_ms, cpu_hourly, gpu_hourly, training_hours, retrains_per_month, cpu_hours=730, days=30):
    monthly_items = daily_items * days
    monthly_cost = cpu_hourly * cpu_hours + gpu_hourly * training_hours * retrains_per_month
    cost_per_1000 = monthly_cost / monthly_items * 1000 if monthly_items else 0.0
    inference_hours = monthly_items / throughput_per_second / 3600 if throughput_per_second else float("inf")
    return {
        "monthly_cost": monthly_cost,
        "throughput_per_second": throughput_per_second,
        "p95_latency_ms": p95_latency_ms,
        "cost_per_1000": cost_per_1000,
        "inference_hours": inference_hours,
    }


def break_even_daily_items(input_tokens, output_tokens, input_per_million, output_per_million, self_cost, days=30):
    per_item = input_tokens * input_per_million / 1_000_000 + output_tokens * output_per_million / 1_000_000
    return None if per_item == 0 else self_cost / (days * per_item)


def choose_cheapest(configs, min_accuracy, max_p95_latency_ms):
    eligible = [
        config for config in configs
        if config["accuracy"] >= min_accuracy and config["p95_latency_ms"] <= max_p95_latency_ms
    ]
    if not eligible:
        raise ValueError("quality/latency constraints cannot be met")
    return min(eligible, key=lambda config: config["monthly_cost"])
