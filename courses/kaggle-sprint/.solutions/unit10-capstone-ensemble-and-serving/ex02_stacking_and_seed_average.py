import numpy as np
from sklearn.linear_model import Ridge


def seed_average(predictions):
    return np.stack(predictions, axis=0).mean(axis=0)


def prediction_correlation(oof_matrix):
    return np.corrcoef(np.asarray(oof_matrix, dtype=float), rowvar=False)


def fit_stacking_meta(oof_matrix, y_true, alpha=1.0):
    model = Ridge(alpha=alpha)
    model.fit(oof_matrix, y_true)
    return model


def predict_stacking(meta_model, test_prediction_matrix):
    return np.asarray(meta_model.predict(test_prediction_matrix), dtype=float)
