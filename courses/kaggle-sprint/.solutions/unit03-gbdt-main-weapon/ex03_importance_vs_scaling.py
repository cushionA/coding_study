import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


def importance_table(model, feature_names):
    values = np.asarray(model.feature_importances_, dtype=float)
    total = float(values.sum())
    share = values / total if total else np.zeros_like(values)
    return (
        pd.DataFrame({"feature": list(feature_names), "importance": values, "share": share})
        .sort_values(["importance", "feature"], ascending=[False, True])
        .reset_index(drop=True)
    )


def scale_train_valid(X_train, X_valid):
    scaler = StandardScaler()
    train_scaled = scaler.fit_transform(X_train)
    valid_scaled = scaler.transform(X_valid)
    return train_scaled, valid_scaled, scaler
