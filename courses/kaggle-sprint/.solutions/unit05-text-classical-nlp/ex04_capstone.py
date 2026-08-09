import numpy as np
from sklearn.base import clone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC


def make_text_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char", ngram_range=(2, 4), min_df=1, sublinear_tf=True)),
        ("model", LinearSVC(class_weight="balanced", random_state=42)),
    ])


def make_oof_predictions(texts, labels, splitter, pipeline=None):
    texts = np.asarray(texts, dtype=object)
    labels = np.asarray(labels)
    predictions = np.full(len(labels), None, dtype=object)
    base = make_text_pipeline() if pipeline is None else pipeline
    for train_idx, valid_idx in splitter.split(texts, labels):
        model = clone(base)
        model.fit(texts[train_idx].tolist(), labels[train_idx])
        predictions[valid_idx] = model.predict(texts[valid_idx].tolist())
    return predictions


def decision_scores(pipeline, texts):
    return np.asarray(pipeline.decision_function(list(texts)))
