# ex02_tokenize_and_tfidf: 日本語を語へ分け、train語彙で疎行列にする

import numpy as np
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction.text import TfidfVectorizer


_TOKENIZER = Tokenizer()


# Janomeで分割し、名詞・動詞の表層形だけを返す
def content_words(text):
    # TODO: tokenize結果から品詞先頭を見て必要なtoken.surfaceを選ぶ
    raise NotImplementedError


# vectorizerをtrainだけでfitし、train/testを同じ語彙へ変換する
# 戻り値: (X_train, X_test, fitted_vectorizer)
def tfidf_train_test(train_texts, test_texts, min_df=1):
    # TODO: tokenizerを指定したTfidfVectorizerでfit_transform/transformする
    raise NotImplementedError


# 疎行列の全要素のうち非ゼロが占める割合を返す
def sparse_density(matrix):
    # TODO: nnzとshapeだけで計算し、dense化しない
    raise NotImplementedError
