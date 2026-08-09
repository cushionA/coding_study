# ex03_lr_schedule: optimizer stepに合わせたwarmupと減衰を計算する

import numpy as np


# step=0から始まるwarmup + linear decayの学習率を返す
def warmup_linear_lr(step, total_steps, warmup_steps, base_lr):
    # TODO: warmup区間と、その後0へ向かう区間を分ける
    raise NotImplementedError


# 0..total_steps-1の学習率配列を返す
def lr_series(total_steps, warmup_steps, base_lr):
    # TODO: warmup_linear_lrを全stepへ適用する
    raise NotImplementedError


# 勾配累積後の実効batch sizeを返す
def effective_batch_size(micro_batch_size, accumulation_steps, device_count=1):
    # TODO: 3要素を掛ける
    raise NotImplementedError
