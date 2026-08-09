# ex02_group_and_time_split: 本番の未知条件に合わせた分割を作る

import numpy as np
import pandas as pd


# trainとvalidの両方に現れるgroup値を集合で返す
def group_overlap(groups, train_idx, valid_idx):
    # TODO: 位置で2群を取り出し、共通する値を求める
    raise NotImplementedError


# cutoffより前を学習、cutoff以降を検証にする位置インデックスを返す
def split_by_cutoff(dates, cutoff):
    # TODO: 日付へ変換して比較し、Trueになった位置を2本の配列にする
    raise NotImplementedError


# NaNが残りうるOOFから、実際に検証された行だけのマスクを返す
def validated_mask(oof):
    # TODO: 数値配列のNaNを反転したブールマスクを返す
    raise NotImplementedError
