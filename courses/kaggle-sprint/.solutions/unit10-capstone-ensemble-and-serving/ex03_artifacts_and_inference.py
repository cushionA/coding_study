from pathlib import Path
import joblib
import numpy as np
import pandas as pd


def save_artifacts(path, model, preprocessor, metadata):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "preprocessor": preprocessor, "metadata": dict(metadata)}, path)


def load_artifacts(path):
    bundle = joblib.load(path)
    if set(bundle) != {"model", "preprocessor", "metadata"}:
        raise ValueError("artifact keys mismatch")
    return bundle


def schema_report(frame, expected_columns):
    expected = list(expected_columns)
    actual = list(frame.columns)
    return {
        "missing": sorted(set(expected) - set(actual)),
        "extra": sorted(set(actual) - set(expected)),
        "order_ok": actual == expected,
    }


def drift_report(reference, current, numeric_columns, categorical_columns, reference_predictions, current_predictions):
    report = {"numeric": {}, "categorical": {}, "prediction_mean_delta": None}
    for column in numeric_columns:
        report["numeric"][column] = {
            "mean_delta": float(current[column].mean() - reference[column].mean()),
            "missing_rate_delta": float(current[column].isna().mean() - reference[column].isna().mean()),
        }
    for column in categorical_columns:
        reference_rate = reference[column].value_counts(normalize=True, dropna=False)
        current_rate = current[column].value_counts(normalize=True, dropna=False)
        levels = reference_rate.index.union(current_rate.index)
        delta = current_rate.reindex(levels, fill_value=0) - reference_rate.reindex(levels, fill_value=0)
        report["categorical"][column] = {"max_rate_delta": float(delta.abs().max())}
    report["prediction_mean_delta"] = float(np.mean(current_predictions) - np.mean(reference_predictions))
    return report


def inference_frame(bundle, frame, id_column, prediction_column="prediction"):
    expected = bundle["metadata"]["columns"]
    features = frame.loc[:, expected]
    transformed = bundle["preprocessor"].transform(features)
    prediction = bundle["model"].predict(transformed)
    return pd.DataFrame({id_column: frame[id_column].to_numpy(), prediction_column: prediction})
