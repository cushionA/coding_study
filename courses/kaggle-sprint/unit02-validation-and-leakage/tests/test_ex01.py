from conftest import load_exercise
import numpy as np
from sklearn.model_selection import KFold

ex = load_exercise("ex01_manual_oof")


# fold予測は学習foldのキー別平均を使う
def test_predict_fold_mean_known_keys():
    keys = np.array(["A", "A", "B", "B", "A"])
    y = np.array([1.0, 3.0, 10.0, 14.0, 99.0])
    pred, unknown = ex.predict_fold_mean(keys, y, np.array([0, 1, 2, 3]), np.array([4]))
    assert np.allclose(pred, [2.0])
    assert unknown == 0


# 学習foldに無いキーは学習fold全体の平均で埋める
def test_predict_fold_mean_unknown_key_fallback():
    keys = np.array(["A", "A", "B"])
    y = np.array([2.0, 4.0, 100.0])
    pred, unknown = ex.predict_fold_mean(keys, y, np.array([0, 1]), np.array([2]))
    assert np.allclose(pred, [3.0])
    assert unknown == 1


# KFoldのOOFは元データと同じ長さで全行がちょうど1回埋まる
def test_make_oof_shape_and_fill_count():
    keys = np.array(["A", "A", "B", "B", "C", "C"])
    y = np.arange(6, dtype=float)
    oof, count = ex.make_oof_mean_predictions(keys, y, KFold(3, shuffle=True, random_state=7))
    assert oof.shape == (6,)
    assert np.isnan(oof).sum() == 0
    assert np.array_equal(count, np.ones(6, dtype=int))


# groupsを要求するsplitterにも同じ関数を使える
def test_make_oof_passes_groups():
    from sklearn.model_selection import GroupKFold
    keys = np.array(["A", "A", "B", "B", "C", "C"])
    y = np.arange(6, dtype=float)
    oof, count = ex.make_oof_mean_predictions(keys, y, GroupKFold(3), groups=keys)
    assert np.isnan(oof).sum() == 0
    assert count.min() == count.max() == 1
