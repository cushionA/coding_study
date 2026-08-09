from conftest import load_exercise
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

ex = load_exercise("ex03_artifacts_and_inference")


# 保存した学習済み部品とmetadataが同じ予測を保つか確認する。
def test_artifact_roundtrip(tmp_path):
    scaler = StandardScaler().fit([[0], [1]])
    model = LinearRegression().fit(scaler.transform([[0], [1]]), [1, 3])
    path = tmp_path / "nested" / "bundle.joblib"
    ex.save_artifacts(path, model, scaler, {"seed": 42, "columns": ["x"]})
    loaded = ex.load_artifacts(path)
    assert loaded["metadata"]["seed"] == 42


# missing・extra・列順を学習時schemaと比較できるか確認する。
def test_schema_report_contract():
    frame = pd.DataFrame({"b": [1], "c": [2]})
    assert ex.schema_report(frame, ["a", "b"]) == {
        "missing": ["a"], "extra": ["c"], "order_ok": False
    }


# 数値・カテゴリ・予測分布の三種類のdriftを検出する。
def test_drift_report_all_families():
    reference = pd.DataFrame({"x": [1.0, 3.0, None], "category": ["A", "A", "B"]})
    current = pd.DataFrame({"x": [3.0, 5.0, 7.0], "category": ["B", "B", "B"]})
    report = ex.drift_report(reference, current, ["x"], ["category"], [0.1, 0.2], [0.6, 0.8])
    assert report["numeric"]["x"]["mean_delta"] == 3.0
    assert report["categorical"]["category"]["max_rate_delta"] > 0.6
    assert np.isclose(report["prediction_mean_delta"], 0.55)


# artifactを2回読む推論が同じID順・同じ予測を再現する。
def test_inference_frame_reproducible(tmp_path):
    train = pd.DataFrame({"x": [0.0, 1.0]})
    scaler = StandardScaler().fit(train)
    model = LinearRegression().fit(scaler.transform(train), [1.0, 3.0])
    path = tmp_path / "bundle.joblib"
    ex.save_artifacts(path, model, scaler, {"columns": ["x"]})
    frame = pd.DataFrame({"id": [10, 11], "x": [2.0, 3.0]})
    first = ex.inference_frame(ex.load_artifacts(path), frame, "id")
    second = ex.inference_frame(ex.load_artifacts(path), frame, "id")
    pd.testing.assert_frame_equal(first, second)
    assert first["id"].tolist() == [10, 11]
