# ex03_rule_vs_tagger: 規則を「書式ごと」に測り、どこで負けているかを突き止める
# lesson では 1書式の正規表現と学習モデル(タガー)を、既知書式 / 新書式 という
# あらかじめ用意した2つのマスクで比べた。実務ではそのマスクを自分で作るところから始まる。
# ここでは (1) 正解の型番から書式を判定し、(2) 正規表現を継ぎ足せる形にし、
# (3) 書式ごとの完全一致率の表を作って、(4) 複数の手法を同じ基準で並べる。
# 「全体で 0.30」では何も分からない。書式ごとに割ると、継ぎ足しの限界が数字で見える。

import re
import unicodedata

import pandas as pd


# --- ここは完成済み。書かなくてよい ---
# 抜き出した綴りを正規形に直す(ハイフンが落ちている綴りにハイフンを戻す)。
def restore_hyphen(code: str) -> str:
    if not code:
        return ""
    if "-" in code:
        return code
    if re.fullmatch(r"[A-Z][0-9]{5}", code):
        return code[:4] + "-" + code[4:]
    if re.fullmatch(r"[A-Z]{2}[0-9]{4}", code):
        return code[:2] + "-" + code[2:]
    if re.fullmatch(r"[0-9]{4}[A-Z]{2}", code):
        return code[:4] + "-" + code[4:]
    return code


# 正解の型番(正規形)がどの書式かを判定して、書式名を返す。
#   "A999-99"  … 英字1文字 + 数字3桁 + ハイフン + 数字2桁 (例 A340-57)
#   "AA-9999"  … 英字2文字 + ハイフン + 数字4桁      (例 AB-1234)
#   "9999-AA"  … 数字4桁 + ハイフン + 英字2文字      (例 1234-XY)
#   "other"    … 上のどれにも当てはまらない(空文字も含む)
def detect_format(model_code: str) -> str:
    # TODO: 3つの書式を順に照合し、当てはまった書式名を返す。
    #       どれにも当てはまらなければ "other"(部分一致ではなく全体が一致することを確かめる)
    raise NotImplementedError


# タイトルから型番を1つ抜き出す。規則(段0)の実装。
# 仕様: まず全角を半角に揃えてから、patterns を先頭から順に試し、
#       最初に見つかった書式のヒット箇所を restore_hyphen に通して返す。
#       どの正規表現も当たらなければ空文字 "" を返す。
# patterns は「コンパイル済みの正規表現のリスト」。書式が増えたらここに足していく — という
# 継ぎ足しの構造そのものを引数にしてある。
def rule_extract(title: str, patterns: list[re.Pattern]) -> str:
    # TODO: 全角→半角の正規化(lesson と同じもの)をしてから、patterns を順に試す
    raise NotImplementedError


# 正解の書式ごとに、件数と完全一致率を出す。
# 戻り値: index が書式名(昇順)、列が ["n", "exact_match"] の DataFrame。
#         n は その書式の正解が何件あったか、exact_match は予測が正解と完全一致した割合。
# preds と golds は同じ長さの列(リストでも Series でもよい)。
def exact_match_by_format(preds, golds) -> pd.DataFrame:
    # TODO: 正解の側から書式を判定してグループにし、グループごとに件数と一致率を出す
    raise NotImplementedError


# 複数の手法を、同じ基準(書式ごとの完全一致率)で1枚の表に並べる。
# preds_by_method: {"手法名": 予測の列} の辞書。
# 戻り値: index が手法名(preds_by_method の順)、列が書式名(昇順)の DataFrame。
#         値はその手法・その書式での完全一致率。
def compare_methods(preds_by_method: dict, golds) -> pd.DataFrame:
    # TODO: 手法ごとに上の関数を使い、行方向に積み上げて表にする
    raise NotImplementedError
