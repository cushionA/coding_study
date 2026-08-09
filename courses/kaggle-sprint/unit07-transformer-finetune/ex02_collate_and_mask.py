# ex02_collate_and_mask: 可変長ID列を最小限のpaddingでbatch化する

import numpy as np


# batch内最長またはmax_lengthへ揃え、input_idsとattention_maskを返す
def dynamic_pad(sequences, pad_id=0, max_length=None):
    # TODO: 必要なら切り詰め、2次元ID配列と有効位置1のmaskを作る
    raise NotImplementedError


# (batch, seq) maskをattention加算用(batch,1,1,seq)へ変換する
# 有効位置は0、padding位置は大きな負値
def attention_bias(attention_mask):
    # TODO: 軸を2本追加し、0/1を0/-1e9へ写す
    raise NotImplementedError


# 配列中のpad token総数を返す
def count_padding(input_ids, pad_id=0):
    # TODO: 比較結果のTrue数を数える
    raise NotImplementedError
