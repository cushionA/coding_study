import numpy as np
from sklearn.base import clone


def fit_and_predict(estimator, X_train, y_train, X_valid):
    model = clone(estimator)
    model.fit(X_train, y_train)
    return model, np.asarray(model.predict(X_valid))


def compare_parameter(estimator, param_name, values, X_train, y_train, X_valid, y_valid, scorer):
    scores = {}
    for value in values:
        model = clone(estimator).set_params(**{param_name: value})
        model.fit(X_train, y_train)
        scores[value] = float(scorer(y_valid, model.predict(X_valid)))
    return scores
