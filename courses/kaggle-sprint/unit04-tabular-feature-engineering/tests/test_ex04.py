from conftest import load_exercise
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold

ex = load_exercise("ex04_capstone")


def _data():
    X = pd.DataFrame({"num": [1.0, 2.0, None, 4.0, 5.0, 6.0], "cat": ["A", "A", "B", None, "B", "C"]})
    y = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
    return X, y


# preprocessorは欠損と未知カテゴリを処理できる
def test_make_preprocessor_handles_missing_and_unknown():
    X, y = _data()
    pre = ex.make_preprocessor(["num"], ["cat"])
    train = pre.fit_transform(X, y)
    valid = pre.transform(pd.DataFrame({"num": [None], "cat": ["Z"]}))
    assert train.shape[1] == valid.shape[1]


# Pipelineはpreprocess/modelの名前付き2段になる
def test_make_pipeline_steps():
    pipe = ex.make_pipeline(Ridge(), ["num"], ["cat"])
    assert list(pipe.named_steps) == ["preprocess", "model"]


# OOFは全行を検証し元Pipelineを未学習のまま保つ
def test_make_oof_predictions_complete_and_clone():
    X, y = _data()
    pipe = ex.make_pipeline(Ridge(), ["num"], ["cat"])
    pred = ex.make_oof_predictions(pipe, X, y, KFold(3, shuffle=True, random_state=2))
    assert pred.shape == (6,)
    assert np.isnan(pred).sum() == 0
    assert not hasattr(pipe.named_steps["model"], "coef_")
