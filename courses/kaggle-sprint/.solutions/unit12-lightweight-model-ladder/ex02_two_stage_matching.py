# ex02_two_stage_matching: 一次絞りの「閾値」版と、上限の決め方
# lesson では上位k件で候補を作る candidate_recall を書いた。実務では「類似度がこの値以上」で
# 切ることも多く、その場合は閾値を1つ選ぶ前に、閾値を振ったときに
# 「候補ペア数(= 段4に払うコスト)」と「再現率(= 全体の上限)」がどう動くかを一覧にする。
# 段3で落とした候補は段4では二度と拾えない — だから先に上限を見てから閾値を決める。

import numpy as np
import pandas as pd


# 類似度行列から、閾値以上の候補ペアを列挙して返す。
# 仕様: (i, j) と (j, i) は同じペアなので i < j のものだけを返す(対角も含めない)。
#       戻り値は (i, j) のタプルのリストで、i の昇順・同じ i なら j の昇順に並べる。
def candidate_pairs(sim_matrix: np.ndarray, threshold: float) -> list[tuple[int, int]]:
    s = np.asarray(sim_matrix, dtype=float)
    rows, cols = np.where(np.triu(np.ones_like(s, dtype=bool), k=1) & (s >= threshold))
    return [(int(i), int(j)) for i, j in zip(rows, cols)]


# 候補生成の成績を1つの辞書にまとめる。
# 戻り値のキー:
#   n_candidates : 候補ペア数(段4に払うコストに比例する)
#   n_positive   : 候補のうち group_keys が一致するペアの数
#   recall       : n_positive ÷ 正例の総数。これが二段構え全体の上限になる
#   positive_rate: n_positive ÷ n_candidates(候補0件のときは 0.0)
# 正例の総数は「同じ group_keys を持つレコードから作れるペアの数」の合計。
# グループのサイズが v なら v*(v-1)//2 件。
def pair_stats(sim_matrix: np.ndarray, group_keys, threshold: float) -> dict:
    g = np.asarray(group_keys)
    pairs = candidate_pairs(sim_matrix, threshold)
    n_pos = sum(1 for i, j in pairs if g[i] == g[j])
    total_pos = int(sum(v * (v - 1) // 2 for v in pd.Series(g).value_counts()))
    return {
        "n_candidates": len(pairs),
        "n_positive": n_pos,
        "recall": float(n_pos / total_pos) if total_pos else 0.0,
        "positive_rate": float(n_pos / len(pairs)) if pairs else 0.0,
    }


# 閾値を振って、候補数と再現率の動きを1枚の表にする。
# 戻り値: 列が ["threshold", "n_candidates", "n_positive", "recall", "positive_rate"] の DataFrame。
#         行は thresholds に与えられた順。index は 0 から振り直す。
def threshold_sweep(sim_matrix: np.ndarray, group_keys, thresholds) -> pd.DataFrame:
    rows = []
    for t in thresholds:
        st = pair_stats(sim_matrix, group_keys, t)
        rows.append({"threshold": float(t), **st})
    return pd.DataFrame(
        rows,
        columns=["threshold", "n_candidates", "n_positive", "recall", "positive_rate"],
    ).reset_index(drop=True)


# 一覧表から、運用条件を満たす閾値を1つ選ぶ。
# 条件: recall が min_recall 以上、かつ n_candidates が max_candidates 以下。
# その中で n_candidates が最小の行の threshold を float で返す(段4の費用が一番安い)。
# 条件を満たす行が1つも無ければ ValueError を送出する。
def pick_threshold(sweep: pd.DataFrame, min_recall: float, max_candidates: int) -> float:
    ok = sweep[(sweep["recall"] >= min_recall) & (sweep["n_candidates"] <= max_candidates)]
    if len(ok) == 0:
        raise ValueError(
            f"再現率 {min_recall} 以上かつ候補 {max_candidates} 件以下を満たす閾値がない"
            "(一次絞りの上限に届いていない)"
        )
    return float(ok.sort_values("n_candidates").iloc[0]["threshold"])
