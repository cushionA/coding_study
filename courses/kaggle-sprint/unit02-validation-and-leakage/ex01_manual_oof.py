# ex01_manual_oof: カテゴリ平均モデルでOOF予測を組み立てる
# splitterはC#のIEnumerable<(trainIdx, validIdx)>と同じ感覚で扱う。

import numpy as np
import pandas as pd


# 学習foldだけでキー別平均を作り、検証foldを予測する
# 戻り値: (検証予測の配列, 学習foldに無かったキーの件数)
def predict_fold_mean(keys, target, train_idx, valid_idx):
    # TODO: 学習位置だけから対応表を作り、未知キーは学習fold全体の平均で埋める
    raise NotImplementedError


# splitterの全foldを回し、各行を未学習モデルで1回ずつ予測する
# 戻り値: (OOF予測, 各行に予測を書いた回数)
def make_oof_mean_predictions(keys, target, splitter, groups=None):
    # TODO: NaNのOOF配列と回数配列を用意し、valid位置へfold予測を書き戻す
    raise NotImplementedError
