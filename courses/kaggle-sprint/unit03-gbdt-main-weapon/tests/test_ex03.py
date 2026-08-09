from conftest import load_exercise
import numpy as np

ex = load_exercise("ex03_importance_vs_scaling")


class FakeModel:
    feature_importances_ = np.array([2.0, 6.0, 2.0])


# 重要度は降順で割合の合計が1になる
def test_importance_table_sorted_and_normalized():
    table = ex.importance_table(FakeModel(), ["a", "b", "c"])
    assert list(table.columns) == ["feature", "importance", "share"]
    assert list(table["feature"]) == ["b", "a", "c"]
    assert np.isclose(table["share"].sum(), 1.0)


# scalerはtrainの統計でfitされる
def test_scale_train_valid_uses_train_statistics():
    train = np.array([[0.0], [2.0], [4.0]])
    valid = np.array([[100.0]])
    tr, va, scaler = ex.scale_train_valid(train, valid)
    assert np.allclose(tr.mean(axis=0), [0.0])
    assert np.allclose(scaler.mean_, [2.0])
    assert va[0, 0] > 10.0, "valid自身の平均で中心化してはいけない"


# 変換後も行列shapeを保つ
def test_scale_train_valid_preserves_shapes():
    tr, va, _ = ex.scale_train_valid(np.ones((4, 2)), np.ones((3, 2)))
    assert tr.shape == (4, 2)
    assert va.shape == (3, 2)
