import numpy as np
import pandas as pd
import lightgbm as lgb
from lightgbm import LGBMRegressor


def train_price_baseline(X_train, y_log_train, X_valid, y_log_valid, stopping_rounds=20):
    model = LGBMRegressor(
        n_estimators=500,
        learning_rate=0.05,
        random_state=42,
        verbosity=-1,
    )
    model.fit(
        X_train,
        y_log_train,
        eval_set=[(X_valid, y_log_valid)],
        eval_metric="rmse",
        callbacks=[lgb.early_stopping(stopping_rounds, verbose=False), lgb.log_evaluation(0)],
    )
    pred = np.asarray(model.predict(X_valid), dtype=float)
    score = float(np.sqrt(np.mean((np.asarray(y_log_valid) - pred) ** 2)))
    return {"model": model, "prediction_log": pred, "best_iteration": int(model.best_iteration_), "rmsle": score}


def to_price(prediction_log):
    return np.clip(np.expm1(np.asarray(prediction_log, dtype=float)), 0.0, None)


def top_features(model, feature_names, k=5):
    order = np.argsort(-np.asarray(model.feature_importances_))[:k]
    names = np.asarray(feature_names, dtype=object)
    return names[order].tolist()
