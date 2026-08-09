import numpy as np
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def make_preprocessor(numeric_cols, categorical_cols):
    numeric = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    categorical = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([("numeric", numeric, numeric_cols), ("categorical", categorical, categorical_cols)])


def make_pipeline(estimator, numeric_cols, categorical_cols):
    return Pipeline([("preprocess", make_preprocessor(numeric_cols, categorical_cols)), ("model", estimator)])


def make_oof_predictions(pipeline, X, y, splitter, groups=None):
    y = np.asarray(y)
    oof = np.full(len(y), np.nan)
    for train_idx, valid_idx in splitter.split(X, y, groups):
        model = clone(pipeline)
        model.fit(X.iloc[train_idx], y[train_idx])
        oof[valid_idx] = model.predict(X.iloc[valid_idx])
    return oof
