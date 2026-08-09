from conftest import load_exercise
import numpy as np
import pandas as pd

ex = load_exercise("ex03_groupby_and_datetime")


# transformで行数を変えず群平均と差を付ける
def test_add_group_relative_values_and_shape():
    df = pd.DataFrame({"g": ["A", "A", "B"], "v": [1.0, 3.0, 10.0]})
    out = ex.add_group_relative(df, "g", "v")
    assert out.shape[0] == 3
    assert np.allclose(out["v_group_mean"], [2.0, 2.0, 10.0])
    assert np.allclose(out["v_group_diff"], [-1.0, 1.0, 0.0])


# 日曜と月曜も円周上で連続した特徴になる
def test_add_weekday_cycle_range():
    df = pd.DataFrame({"d": ["2026-08-02", "2026-08-03"]})
    out = ex.add_weekday_cycle(df, "d")
    assert list(out["d_dayofweek"]) == [6, 0]
    radius = out["d_week_sin"] ** 2 + out["d_week_cos"] ** 2
    assert np.allclose(radius, 1.0)


# 入力が未ソートでもentity内の時刻順でlagし、元の行順を保つ
def test_add_lag_one_sorts_then_restores():
    df = pd.DataFrame({"id": ["A", "A", "B", "A"], "d": ["2026-01-03", "2026-01-01", "2026-01-02", "2026-01-02"], "v": [30, 10, 99, 20]})
    out = ex.add_lag_one(df, "id", "d", "v")
    assert list(out.index) == list(df.index)
    assert out.loc[0, "v_lag1"] == 20
    assert pd.isna(out.loc[1, "v_lag1"])
    assert out.loc[3, "v_lag1"] == 10
