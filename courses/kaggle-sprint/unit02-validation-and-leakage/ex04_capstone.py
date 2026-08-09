# ex04_capstone: 1回の分割を、本番に近いか判断できる監査レポートへ変える

import numpy as np
import pandas as pd


# 分割のサイズ・group重複・未知率・時間順序をまとめて返す
# 戻り値のキー: n_train, n_valid, group_overlap_count, unknown_group_rate, chronological
def audit_split(groups, dates, train_idx, valid_idx):
    # TODO: 行位置でgroupと日付を分け、5項目の辞書を組み立てる
    raise NotImplementedError


# OOF配列を安全に採点するため、検証済みの正解と予測だけを返す
# 戻り値: (y_validated, oof_validated)
def select_validated_rows(y, oof):
    # TODO: OOFがNaNでない行だけを同じマスクで2配列から選ぶ
    raise NotImplementedError
