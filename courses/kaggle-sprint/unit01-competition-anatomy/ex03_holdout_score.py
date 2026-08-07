# ex03_holdout_score: ホールドアウト検証でカテゴリ別中央値ベースラインを採点する
# lesson では「train 全体から作ったカテゴリ別中央値」を test に貼るところまでやった。
# しかし本当は「学習に使っていないデータでどれくらい当たるか」を先に測っておくべきだ(検証設計の入口)。
# ここでは train を学習側/検証側に割り、検証側にしか無いカテゴリが出たら学習側の全体中央値に退避する
# ——これは lesson で見た「test にしか無いカテゴリ」とまったく同じ問題である。

import numpy as np
import pandas as pd


# RMSLE。lesson で書いたものと同じ式(概念1)。ここでは再演習の価値が低いので完成品として与える。
def rmsle(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((np.log1p(y_pred) - np.log1p(y_true)) ** 2)))


# df を学習側/検証側にランダム分割する(random_state を固定した決定的な分割)。
# 戻り値: (train_part, valid_part) の2つの DataFrame。行の重複・欠落がないこと。
def split_holdout(df, valid_frac=0.2, random_state=0):
    # TODO: df 全体をシャッフルしてから、先頭 valid_frac 分を valid、残りを train として切り出す。
    #       同じ random_state なら毎回同じ分割になるようにする(ヒント参照)。
    raise NotImplementedError


# train_part だけから category_col ごとの price 中央値を作り、valid_part を採点する。
# valid_part にしか無いカテゴリが出たら、train_part の全体中央値に退避する。
# 戻り値: {"rmsle": float, "n_unseen_category": int}
def category_median_baseline_score(train_part, valid_part, category_col="category", target_col="price"):
    # TODO: train_part から category_col ごとの target_col 中央値の対応表を作る。
    #       valid_part の各行をその対応表で引き、対応表に無いカテゴリは train_part 全体の中央値で埋める。
    #       埋めた件数を数え、rmsle(...) で採点して dict にまとめる。
    raise NotImplementedError
