import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder


def fit_frequency_encoder(values):
    series = pd.Series(values, dtype="object").fillna("__MISSING__")
    return series.value_counts(normalize=True).to_dict()


def apply_frequency_encoder(values, mapping, unknown_value=0.0):
    series = pd.Series(values, dtype="object").fillna("__MISSING__")
    return series.map(mapping).fillna(unknown_value).to_numpy(dtype=float)


def one_hot_train_test(train, test, columns):
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    train_array = encoder.fit_transform(train[columns])
    test_array = encoder.transform(test[columns])
    return train_array, test_array, encoder.get_feature_names_out(columns).tolist(), encoder
