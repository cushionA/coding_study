# ex04_capstone: 実データ風の集計処理(ex01〜ex03の総合演習)
# 「生徒 x 科目」の得点表(2次元配列)を題材に、生成・マスク・ブロードキャストを組み合わせる。
# C#で書くなら二重ループ+LINQ集計になる処理を、NumPyでは軸(axis)指定だけで書く。

import numpy as np


# シード固定の乱数で「生徒 n_students 人 x 科目 n_subjects 科目」の得点表(0〜100点)を作る
# np.random.default_rng(seed) で再現性のある乱数生成器を作り、その generator の
# integers(low, high, size) で整数配列を作る(high は含まれない)
def make_scores(n_students, n_subjects, seed=0):
    rng = np.random.default_rng(seed)
    return rng.integers(0, 101, size=(n_students, n_subjects))


# 各生徒の平均点(行ごとの平均)を1次元配列で返す
def student_averages(scores):
    return scores.mean(axis=1)


# 平均点が threshold 以上の生徒の「人数」を返す
# (C#: student_averages.Count(avg => avg >= threshold) に相当)
def count_passing(scores, threshold):
    averages = student_averages(scores)
    return int((averages >= threshold).sum())


# 各科目の得点を、その科目の平均が0になるように中心化した得点表を返す(列ごとの中心化)
# 科目ごとの難易度差を取り除いて比較しやすくする、というのがこの処理の意味
def curve_by_subject(scores):
    return scores - scores.mean(axis=0)
