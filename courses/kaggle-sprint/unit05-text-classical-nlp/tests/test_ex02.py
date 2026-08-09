from conftest import load_exercise
import numpy as np

ex = load_exercise("ex02_tokenize_and_tfidf")


# 助詞を落とし、主要な名詞・動詞を残す
def test_content_words_filters_parts_of_speech():
    words = ex.content_words("赤いカメラを買う")
    assert "カメラ" in words
    assert "買う" in words
    assert "を" not in words


# testだけの語を追加語彙にせず列数を揃える
def test_tfidf_train_test_uses_train_vocabulary():
    Xtr, Xte, vec = ex.tfidf_train_test(["猫 が 走る", "犬 が 眠る"], ["未知語 が 走る"])
    assert Xtr.shape[1] == Xte.shape[1] == len(vec.get_feature_names_out())
    assert "未知語" not in set(vec.get_feature_names_out())


# 既知の2文書・2語彙の疎行列では、非ゼロ率が0.5になる
def test_sparse_density():
    Xtr, _, _ = ex.tfidf_train_test(["猫 猫", "犬"], ["猫"])
    assert np.isclose(ex.sparse_density(Xtr), 0.5)


# 返り値は疎行列のまま
def test_tfidf_returns_sparse_matrix():
    Xtr, Xte, _ = ex.tfidf_train_test(["猫 走る", "犬 眠る"], ["猫"])
    assert hasattr(Xtr, "nnz") and hasattr(Xte, "nnz")
