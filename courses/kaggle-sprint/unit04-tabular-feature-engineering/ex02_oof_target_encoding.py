# ex02: target統計を検証行自身から隔離する

import numpy as np
import pandas as pd


# カテゴリ別目的変数平均と全体平均を学習データから作る
def fit_target_table(categories, target):
    # TODO: category -> target平均のSeriesと全体平均を返す
    raise NotImplementedError


# 対応表をカテゴリへ適用し、未知カテゴリはglobal_meanで埋める
def apply_target_table(categories, table, global_mean):
    # TODO: mapとfillnaを使いfloat配列で返す
    raise NotImplementedError


# 各foldの学習側だけで表を作り、検証位置へtarget encodingを書き戻す
def oof_target_encode(categories, target, splitter, groups=None):
    # TODO: NaN配列を用意し、splitループ内でfit/applyしてvalid位置へ入れる
    raise NotImplementedError
