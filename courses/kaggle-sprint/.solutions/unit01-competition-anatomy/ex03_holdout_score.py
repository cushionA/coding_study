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
    n_valid = int(len(df) * valid_frac)
    shuffled = df.sample(frac=1.0, random_state=random_state)
    valid_part = shuffled.iloc[:n_valid]
    train_part = shuffled.iloc[n_valid:]
    return train_part, valid_part


# train_part だけから category_col ごとの price 中央値を作り、valid_part を採点する。
# valid_part にしか無いカテゴリが出たら、train_part の全体中央値に退避する。
# 戻り値: {"rmsle": float, "n_unseen_category": int}
def category_median_baseline_score(train_part, valid_part, category_col="category", target_col="price"):
    medians = train_part.groupby(category_col)[target_col].median()
    overall_median = float(train_part[target_col].median())

    preds = []
    n_unseen = 0
    for cat in valid_part[category_col]:
        if cat in medians.index:
            preds.append(float(medians.loc[cat]))
        else:
            preds.append(overall_median)
            n_unseen += 1

    score = rmsle(valid_part[target_col].to_numpy(dtype=float), np.array(preds, dtype=float))
    return {"rmsle": score, "n_unseen_category": n_unseen}
