import numpy as np
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction.text import TfidfVectorizer


_TOKENIZER = Tokenizer()


def content_words(text):
    return [token.surface for token in _TOKENIZER.tokenize(str(text)) if token.part_of_speech.split(",")[0] in {"名詞", "動詞"}]


def tfidf_train_test(train_texts, test_texts, min_df=1):
    vectorizer = TfidfVectorizer(tokenizer=content_words, token_pattern=None, min_df=min_df, sublinear_tf=True)
    X_train = vectorizer.fit_transform(train_texts)
    X_test = vectorizer.transform(test_texts)
    return X_train, X_test, vectorizer


def sparse_density(matrix):
    total = matrix.shape[0] * matrix.shape[1]
    return float(matrix.nnz / total) if total else 0.0
