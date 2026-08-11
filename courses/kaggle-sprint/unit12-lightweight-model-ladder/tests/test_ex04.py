import re
import unicodedata
from pathlib import Path

from conftest import load_exercise
import pandas as pd
import pytest

ex = load_exercise("ex04_capstone")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# 段0 規則 / 段5 タガー / 段6 生成 を模した3段。数字は「1日10万件・時間単価36円」で
# きりのよい値になるように選んである(実測値そのものではない)。
STAGES = [
    {"name": "stage0_rule", "accuracy": 0.60, "items_per_sec": 200000.0},
    {"name": "stage5_tagger", "accuracy": 0.80, "items_per_sec": 1000.0},
    {"name": "stage6_gen", "accuracy": 0.90, "items_per_sec": 250.0},
]
N_PER_DAY = 100_000
HOURLY_YEN = 36.0


# measured_stage: 実測したスループットを載せた段の定義が返る
def test_measured_stage_shape():
    seen = []
    stage = ex.measured_stage("stage0_rule", lambda s: seen.append(s), ["x"] * 300, 0.6)

    assert set(stage) == {"name", "accuracy", "items_per_sec"}
    assert stage["name"] == "stage0_rule"
    assert stage["accuracy"] == pytest.approx(0.6)
    assert stage["items_per_sec"] > 0.0
    assert len(seen) == 300, "全件に fn を適用していない"


# stage_plan: 1日の所要時間とインフラ費が段ごとに出る
def test_stage_plan_values():
    plan = ex.stage_plan(STAGES, N_PER_DAY, HOURLY_YEN)

    assert isinstance(plan, pd.DataFrame)
    assert plan.shape == (3, 4), "3段 × ['accuracy','items_per_sec','seconds_per_day','infra_yen_per_day']"
    assert list(plan.index) == ["stage0_rule", "stage5_tagger", "stage6_gen"], (
        "index は段の名前。stages に与えた順を保つ"
    )
    assert list(plan.columns) == [
        "accuracy",
        "items_per_sec",
        "seconds_per_day",
        "infra_yen_per_day",
    ]
    assert plan.loc["stage5_tagger", "seconds_per_day"] == pytest.approx(100.0), (
        "100,000 件 ÷ 1,000 件/秒 = 100 秒"
    )
    assert plan.loc["stage6_gen", "seconds_per_day"] == pytest.approx(400.0)
    assert plan.loc["stage5_tagger", "infra_yen_per_day"] == pytest.approx(1.0), (
        "100 秒 ÷ 3600 × 36 円 = 1.0 円。3600 で割り忘れると 3600 円になる"
    )
    assert plan.loc["stage0_rule", "infra_yen_per_day"] == pytest.approx(0.005)


# add_review_cost: 精度差が人手の確認コストに換算され、総費用が出る
def test_add_review_cost_values():
    plan = ex.stage_plan(STAGES, N_PER_DAY, HOURLY_YEN)
    cost = ex.add_review_cost(plan, N_PER_DAY, yen_per_review=5.0)

    assert list(cost.columns) == [
        "accuracy",
        "items_per_sec",
        "seconds_per_day",
        "infra_yen_per_day",
        "accuracy_gap",
        "review_yen_per_day",
        "total_yen_per_day",
    ], "元の4列の後ろに3列を足す"
    assert cost.loc["stage6_gen", "accuracy_gap"] == pytest.approx(0.0), (
        "表の中で最も精度が高い段の差は 0。基準を 1.0 にしていないか確認する"
    )
    assert cost.loc["stage0_rule", "review_yen_per_day"] == pytest.approx(150000.0), (
        "100,000 件 × 0.30 × 5 円 = 150,000 円"
    )
    assert cost.loc["stage5_tagger", "total_yen_per_day"] == pytest.approx(50001.0), (
        "人件費 50,000 円 + インフラ 1.0 円。インフラ費を足し忘れていないか"
    )
    assert cost.loc["stage6_gen", "total_yen_per_day"] == pytest.approx(4.0)


# add_review_cost: 元の表を書き換えない
def test_add_review_cost_does_not_mutate():
    plan = ex.stage_plan(STAGES, N_PER_DAY, HOURLY_YEN)
    ex.add_review_cost(plan, N_PER_DAY, yen_per_review=5.0)

    assert list(plan.columns) == [
        "accuracy",
        "items_per_sec",
        "seconds_per_day",
        "infra_yen_per_day",
    ], "引数で受け取った表に列を足してしまっている(複製してから足す)"


# choose_stage: 処理時間の上限を満たす中から総費用が最小の段を選ぶ
def test_choose_stage_respects_sla():
    plan = ex.stage_plan(STAGES, N_PER_DAY, HOURLY_YEN)
    cost = ex.add_review_cost(plan, N_PER_DAY, yen_per_review=5.0)

    assert ex.choose_stage(cost, max_seconds_per_day=3600.0) == "stage6_gen", (
        "全段が上限に収まるなら、総費用が最小の段(4.0 円)を選ぶ"
    )
    assert ex.choose_stage(cost, max_seconds_per_day=120.0) == "stage5_tagger", (
        "400 秒かかる段6 は落ちる。残った2段では段5(50,001 円)が段0(150,000 円)より安い"
    )


# choose_stage: 上限を満たす段が無ければ ValueError(勝手に一番速い段を返さない)
def test_choose_stage_raises_when_no_stage_fits():
    plan = ex.stage_plan(STAGES, N_PER_DAY, HOURLY_YEN)
    cost = ex.add_review_cost(plan, N_PER_DAY, yen_per_review=5.0)

    with pytest.raises(ValueError):
        ex.choose_stage(cost, max_seconds_per_day=0.1)


# stage_report: 判断の根拠(表)と結論(段名)が一度に返る
def test_stage_report_end_to_end():
    table, chosen = ex.stage_report(
        STAGES,
        n_items_per_day=N_PER_DAY,
        hourly_yen=HOURLY_YEN,
        yen_per_review=5.0,
        max_seconds_per_day=120.0,
    )

    assert isinstance(table, pd.DataFrame)
    assert table.shape == (3, 7)
    assert chosen == "stage5_tagger"
    assert table.loc[chosen, "total_yen_per_day"] == pytest.approx(50001.0)


# stage_report: 確認単価が 0 なら精度差は費用に効かず、一番安い段が選ばれる
def test_stage_report_zero_review_cost():
    table, chosen = ex.stage_report(
        STAGES,
        n_items_per_day=N_PER_DAY,
        hourly_yen=HOURLY_YEN,
        yen_per_review=0.0,
        max_seconds_per_day=3600.0,
    )

    assert chosen == "stage0_rule", (
        "間違いが実害を生まない用途では、精度差は費用に換算されない。"
        "常に精度が最高の段を返しているなら費用の比較ができていない"
    )
    assert table.loc["stage0_rule", "total_yen_per_day"] == pytest.approx(0.005)


# 実データ: 規則の速度を自分で測り、その実測値で段を選ぶところまで通す
def test_report_with_measured_rule_stage():
    titles = pd.read_csv(DATA_DIR / "ner_train.csv")["title"]
    pat = re.compile(r"[A-Za-z][0-9]{3}-?[0-9]{2}")

    def rule(t):
        return pat.search(unicodedata.normalize("NFKC", str(t)))

    rule_stage = ex.measured_stage("stage0_rule", rule, titles, accuracy=0.44)
    assert rule_stage["items_per_sec"] > 100.0, "3200件の正規表現照合が1秒あたり100件未満はおかしい"

    stages = [rule_stage, {"name": "stage5_tagger", "accuracy": 0.95, "items_per_sec": 1000.0}]
    table, chosen = ex.stage_report(
        stages,
        n_items_per_day=100_000,
        hourly_yen=36.0,
        yen_per_review=5.0,
        max_seconds_per_day=3600.0,
    )

    assert table.shape == (2, 7)
    assert chosen == "stage5_tagger", (
        "実測では規則の方が桁違いに速いが、精度差 0.51 × 10万件 × 5円 = 255,000 円/日 が乗る。"
        "速さだけで選んではいけない"
    )
