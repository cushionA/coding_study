from conftest import load_exercise
import numpy as np
import pandas as pd
import pytest

ex = load_exercise("ex02_two_stage_matching")

# 4件のレコード。0と1が同じ商品、2と3が同じ商品(正例は2ペアだけ)。
# 対角は lesson と同じく -9.0 にしてある(自分自身を候補にしないため)。
SIM = np.array(
    [
        [-9.0, 0.90, 0.50, 0.20],
        [0.90, -9.0, 0.40, 0.10],
        [0.50, 0.40, -9.0, 0.95],
        [0.20, 0.10, 0.95, -9.0],
    ]
)
KEYS = ["p1", "p1", "p2", "p2"]


# candidate_pairs: 閾値以上のペアだけが i<j の形で並ぶ
def test_candidate_pairs_basic():
    assert ex.candidate_pairs(SIM, 0.9) == [(0, 1), (2, 3)]
    assert ex.candidate_pairs(SIM, 0.5) == [(0, 1), (0, 2), (2, 3)]


# candidate_pairs: (i,j) と (j,i) を二重に数えない / 対角も入らない
def test_candidate_pairs_no_duplicates_and_no_diagonal():
    pairs = ex.candidate_pairs(SIM, 0.0)
    assert len(pairs) == 6, (
        "4件から作れるペアは 4*3/2 = 6 通り。12 なら (i,j) と (j,i) を二重に数えている。"
        "16 なら対角(自分自身)も入っている"
    )
    assert all(i < j for i, j in pairs), "各ペアは i < j に正規化されているはず"


# candidate_pairs: 閾値が高すぎると空になる(境界値)
def test_candidate_pairs_empty():
    assert ex.candidate_pairs(SIM, 0.96) == []


# pair_stats: 候補数・正例数・再現率・正例率が正しい
def test_pair_stats_basic():
    st = ex.pair_stats(SIM, KEYS, 0.5)

    assert st["n_candidates"] == 3
    assert st["n_positive"] == 2, "(0,1) と (2,3) が正例。(0,2) は別商品同士"
    assert st["recall"] == pytest.approx(1.0), "正例の総数は 1+1 = 2 件で、その両方を拾えている"
    assert st["positive_rate"] == pytest.approx(2 / 3), "候補3件のうち正例2件"


# pair_stats: 候補が0件でも 0 除算で落ちない(境界値)
def test_pair_stats_empty_candidates():
    st = ex.pair_stats(SIM, KEYS, 0.96)

    assert st["n_candidates"] == 0
    assert st["n_positive"] == 0
    assert st["recall"] == pytest.approx(0.0)
    assert st["positive_rate"] == pytest.approx(0.0), (
        "候補0件のときの正例率は 0.0。ZeroDivisionError や nan にしない"
    )


# pair_stats: 正例の総数はグループのサイズから作れるペア数の合計(3件のグループなら3ペア)
def test_pair_stats_recall_uses_all_positive_pairs():
    sim = np.array(
        [
            [-9.0, 0.90, 0.10],
            [0.90, -9.0, 0.20],
            [0.10, 0.20, -9.0],
        ]
    )
    st = ex.pair_stats(sim, ["p1", "p1", "p1"], 0.5)

    assert st["n_positive"] == 1
    assert st["recall"] == pytest.approx(1 / 3), (
        "3件が同一商品なら正例は 3*2/2 = 3 ペア。拾えたのは1ペアなので再現率は 1/3。"
        "1.0 になるなら分母を『候補の中の正例』にしてしまっている"
    )


# threshold_sweep: 閾値ごとに1行の表になる
def test_threshold_sweep_shape_and_columns():
    sweep = ex.threshold_sweep(SIM, KEYS, [0.0, 0.5, 0.9, 0.96])

    assert isinstance(sweep, pd.DataFrame)
    assert sweep.shape == (4, 5), "行は閾値の数、列は threshold を含めて5つ"
    assert list(sweep.columns) == [
        "threshold",
        "n_candidates",
        "n_positive",
        "recall",
        "positive_rate",
    ]
    assert list(sweep["threshold"]) == pytest.approx([0.0, 0.5, 0.9, 0.96])
    assert list(sweep["n_candidates"]) == [6, 3, 2, 0]


# threshold_sweep: 閾値を上げると候補数も再現率も増えない(単調性)
def test_threshold_sweep_is_monotonic():
    rng = np.random.default_rng(0)
    emb = rng.normal(0, 1, (40, 8))
    emb /= np.linalg.norm(emb, axis=1, keepdims=True)
    sim = emb @ emb.T
    np.fill_diagonal(sim, -9.0)
    keys = [f"p{i // 2}" for i in range(40)]

    sweep = ex.threshold_sweep(sim, keys, [-1.0, -0.5, 0.0, 0.3, 0.6, 0.9])
    cand = list(sweep["n_candidates"])
    rec = list(sweep["recall"])

    assert cand[0] == 780, "閾値 -1.0 なら全ペア(40*39/2 = 780)が候補になる"
    assert all(a >= b for a, b in zip(cand, cand[1:])), "閾値を上げれば候補は減る一方のはず"
    assert all(a >= b for a, b in zip(rec, rec[1:])), (
        "閾値を上げれば再現率も下がる一方のはず。増えているなら正例の数え方が間違っている"
    )
    assert rec[0] == pytest.approx(1.0), "全ペアが候補なら取りこぼしは無い"


# pick_threshold: 条件を満たす中で候補数が最小の閾値を選ぶ
def test_pick_threshold_picks_cheapest():
    sweep = ex.threshold_sweep(SIM, KEYS, [0.0, 0.5, 0.9, 0.96])

    assert ex.pick_threshold(sweep, min_recall=1.0, max_candidates=6) == pytest.approx(0.9), (
        "再現率 1.0 を満たすのは 0.0 / 0.5 / 0.9 の3つ。そのうち候補が最小(2件)なのは 0.9"
    )
    assert ex.pick_threshold(sweep, min_recall=1.0, max_candidates=2) == pytest.approx(0.9)


# pick_threshold: 条件を満たす行が無ければ ValueError(黙って一番近い行を返さない)
def test_pick_threshold_raises_when_unreachable():
    sweep = ex.threshold_sweep(SIM, KEYS, [0.0, 0.5, 0.9, 0.96])

    with pytest.raises(ValueError):
        ex.pick_threshold(sweep, min_recall=1.0, max_candidates=1)
