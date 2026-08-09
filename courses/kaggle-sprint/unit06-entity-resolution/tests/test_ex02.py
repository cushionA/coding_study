from conftest import load_exercise
import pytest

ex = load_exercise("ex02_string_similarity")


# test_levenshtein_known_example が要求仕様を満たすか確認する。
def test_levenshtein_known_example():
    assert ex.levenshtein("kitten", "sitting") == 3


# test_levenshtein_empty_boundary が要求仕様を満たすか確認する。
def test_levenshtein_empty_boundary():
    assert ex.levenshtein("abc", "") == 3
    assert ex.levenshtein("", "") == 0


# test_normalized_edit_similarity_range が要求仕様を満たすか確認する。
def test_normalized_edit_similarity_range():
    assert ex.normalized_edit_similarity("同じ", "同じ") == 1.0
    assert ex.normalized_edit_similarity("", "") == 1.0
    assert ex.normalized_edit_similarity("abc", "xyz") == 0.0


# test_char_ngrams_and_jaccard が要求仕様を満たすか確認する。
def test_char_ngrams_and_jaccard():
    assert ex.char_ngrams("abcd", 2) == {"ab", "bc", "cd"}
    assert ex.jaccard({"ab", "bc"}, {"bc", "cd"}) == pytest.approx(1 / 3)
    assert ex.jaccard(set(), set()) == 1.0
