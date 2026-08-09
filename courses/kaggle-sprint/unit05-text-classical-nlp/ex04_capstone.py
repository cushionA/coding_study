# ex04_capstone: 正規化・TF-IDF・分類をfoldの内側へ閉じ込める

import numpy as np
from sklearn.base import clone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC


# 表記ゆれに強い文字n-gram TF-IDFとLinearSVCのPipelineを返す
def make_text_pipeline():
    # TODO: 表記ゆれに強いベクトライザと線形分類器を1本へまとめる
    raise NotImplementedError


# Pipeline全体をfoldごとにfitし、全行のOOFクラス予測を返す
def make_oof_predictions(texts, labels, splitter, pipeline=None):
    # TODO: 各foldを学習に使っていないモデルで予測し、元の行位置へ戻す
    raise NotImplementedError


# 学習済みPipelineから各文書のdecision_functionを返す
def decision_scores(pipeline, texts):
    # TODO: Pipelineのdecision_functionを呼びNumPy配列にする
    raise NotImplementedError
