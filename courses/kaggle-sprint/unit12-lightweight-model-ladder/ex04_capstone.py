# ex04_capstone: 「この件数・この精度要求なら、どの段で止めるか」を数字で答える
# ex01(精度とスループットを測る)・ex02(一次絞りの上限)・ex03(書式ごとの比較)で
# バラバラに作った部品を、道具を選ぶ1本の流れにつなぐ。
#
#   実測(件/秒)→ 1日の所要時間とインフラ費 → 精度差を人手の確認コストに換算
#   → 処理時間の上限(SLA)を満たす中で総費用が最小の段を選ぶ
#
# 山場は「2種類の費用を足して初めて判断できる」こと。
# 軽い段はインフラ費が安いが、精度が低いぶん人手の確認コストが乗る。
# lesson の choose_stage は2択だったが、ここでは段がいくつあっても効く形にする。

import time

import pandas as pd


# 1つの段について、実際に fn を items に適用して速度を測り、段の定義(辞書)を作る。
# 戻り値: {"name": name, "accuracy": accuracy, "items_per_sec": 実測したスループット}
# 他人のベンチマークではなく自分の環境で測る、という手順をここで固定する。
def measured_stage(name: str, fn, items, accuracy: float) -> dict:
    # TODO: items の各要素に fn を適用する時間を測り、上の3つのキーを持つ辞書を返す
    raise NotImplementedError


# 段の一覧から、1日あたりの所要時間とインフラ費の表を作る。
# stages: [{"name": ..., "accuracy": ..., "items_per_sec": ...}, ...]
# 戻り値: index が段の名前(stages の順)、列が
#         ["accuracy", "items_per_sec", "seconds_per_day", "infra_yen_per_day"] の DataFrame。
#   seconds_per_day   = n_items_per_day ÷ items_per_sec
#   infra_yen_per_day = seconds_per_day ÷ 3600 × hourly_yen
def stage_plan(stages: list[dict], n_items_per_day: int, hourly_yen: float) -> pd.DataFrame:
    # TODO: 段ごとに2つの列を計算して、上の並びの表にする
    raise NotImplementedError


# 精度差を人手の確認コストに換算して、総費用の列を足した表を返す(元の表は壊さない)。
# 足す列:
#   accuracy_gap        = 表の中で最も高い精度 - その段の精度
#   review_yen_per_day  = n_items_per_day × accuracy_gap × yen_per_review
#   total_yen_per_day   = infra_yen_per_day + review_yen_per_day
def add_review_cost(plan: pd.DataFrame, n_items_per_day: int, yen_per_review: float) -> pd.DataFrame:
    # TODO: 最良精度との差から人件費を出し、インフラ費と足して総費用にする。
    #       plan 自体を書き換えないよう、複製してから列を足すこと
    raise NotImplementedError


# 1日の処理時間の上限(SLA)を満たす段のうち、総費用が最小の段の名前を返す。
# 満たす段が1つも無ければ ValueError を送出する。
# 総費用が同額なら、表で先に現れる段を選ぶ。
def choose_stage(plan: pd.DataFrame, max_seconds_per_day: float) -> str:
    # TODO: 処理時間で絞ってから総費用が最小の行を選ぶ。空になったら例外を投げる
    raise NotImplementedError


# 上の3つを1本につないで、判断の根拠(表)と結論(段の名前)を返す。
# 戻り値: (総費用まで入った表, 選ばれた段の名前) のタプル。
def stage_report(
    stages: list[dict],
    n_items_per_day: int,
    hourly_yen: float,
    yen_per_review: float,
    max_seconds_per_day: float,
) -> tuple[pd.DataFrame, str]:
    # TODO: 表を作る → 人件費を足す → 段を選ぶ、を順に呼んで両方を返す
    raise NotImplementedError
