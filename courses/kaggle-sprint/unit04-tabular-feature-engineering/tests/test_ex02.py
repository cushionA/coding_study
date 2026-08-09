from conftest import load_exercise
import numpy as np
from sklearn.model_selection import KFold

ex = load_exercise("ex02_oof_target_encoding")


# カテゴリ平均と全体平均を返す
def test_fit_target_table_means():
    table, global_mean = ex.fit_target_table(["A", "A", "B"], [1.0, 3.0, 10.0])
    assert table["A"] == 2.0
    assert global_mean == 14 / 3


# 未知カテゴリは全体平均で埋める
def test_apply_target_table_unknown():
    table, mean = ex.fit_target_table(["A", "B"], [2.0, 6.0])
    assert np.allclose(ex.apply_target_table(["A", "Z"], table, mean), [2.0, 4.0])


# OOFは全行ぶん埋まりshapeを保つ
def test_oof_target_encode_shape_and_complete():
    cats = np.array(["A", "A", "B", "B", "C", "C"])
    y = np.arange(6, dtype=float)
    result = ex.oof_target_encode(cats, y, KFold(3, shuffle=True, random_state=0))
    assert result.shape == (6,)
    assert np.isnan(result).sum() == 0


# 全行ユニークなら自分のtargetを直接返してはいけない
def test_oof_target_encode_blocks_self_leak():
    cats = np.array([f"id{i}" for i in range(8)])
    y = np.arange(8, dtype=float) * 10
    result = ex.oof_target_encode(cats, y, KFold(4, shuffle=True, random_state=1))
    assert not np.allclose(result, y)
