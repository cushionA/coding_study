import numpy as np
from sklearn.metrics import f1_score
from sklearn.svm import LinearSVC


def fit_linear_svc(X_train, y_train, C=1.0):
    model = LinearSVC(C=C, class_weight="balanced", random_state=42)
    model.fit(X_train, y_train)
    return model


def f1_summary(y_true, y_pred):
    return {
        "macro_f1": float(f1_score(y_true, y_pred, average="macro")),
        "micro_f1": float(f1_score(y_true, y_pred, average="micro")),
    }


def top_terms_for_class(model, feature_names, class_label, n=5):
    matches = np.where(np.asarray(model.classes_) == class_label)[0]
    if matches.size == 0:
        raise ValueError(f"unknown class: {class_label}")
    row = int(matches[0])
    order = np.argsort(-np.asarray(model.coef_[row]))[:n]
    return np.asarray(feature_names, dtype=object)[order].tolist()
