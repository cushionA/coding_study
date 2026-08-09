from conftest import load_exercise
import numpy as np
from sklearn.model_selection import StratifiedKFold

ex = load_exercise("ex04_capstone")


def _data():
    texts = np.array(["赤い カメラ", "青い カメラ", "写真 レンズ", "犬 の ごはん", "猫 の ごはん", "ペット フード"])
    labels = np.array(["camera", "camera", "camera", "pet", "pet", "pet"])
    return texts, labels


# Pipelineはtfidfとmodelの2段になる
def test_make_text_pipeline_steps():
    pipe = ex.make_text_pipeline()
    assert list(pipe.named_steps) == ["tfidf", "model"]
    assert pipe.named_steps["tfidf"].analyzer == "char"
    assert pipe.named_steps["tfidf"].ngram_range == (2, 4)
    assert pipe.named_steps["tfidf"].sublinear_tf is True
    assert pipe.named_steps["model"].class_weight == "balanced"


# OOFは全行を1回ずつ予測する
def test_make_oof_predictions_complete():
    texts, labels = _data()
    pred = ex.make_oof_predictions(texts, labels, StratifiedKFold(3, shuffle=True, random_state=1))
    assert pred.shape == labels.shape
    assert all(value is not None for value in pred)


# 元Pipelineは未学習のままにする
def test_make_oof_predictions_clones_pipeline():
    texts, labels = _data()
    pipe = ex.make_text_pipeline()
    ex.make_oof_predictions(texts, labels, StratifiedKFold(3), pipeline=pipe)
    assert not hasattr(pipe.named_steps["model"], "coef_")


# decision_functionの行数は入力文書数と一致する
def test_decision_scores_shape():
    texts, labels = _data()
    pipe = ex.make_text_pipeline().fit(texts, labels)
    score = ex.decision_scores(pipe, ["赤い レンズ", "猫 フード"])
    assert np.asarray(score).shape[0] == 2
