from conftest import load_exercise

ex = load_exercise("ex01_subword_tokenizer")


# test_apply_merges_respects_priority が要求仕様を満たすか確認する。
def test_apply_merges_respects_priority():
    assert ex.apply_merges(list("abc"), [("a", "b"), ("ab", "c")]) == ["abc"]


# test_apply_merges_handles_repeated_pairs が要求仕様を満たすか確認する。
def test_apply_merges_handles_repeated_pairs():
    assert ex.apply_merges(list("aaaa"), [("a", "a")]) == ["aa", "aa"]


# test_encode_special_tokens_and_mask が要求仕様を満たすか確認する。
def test_encode_special_tokens_and_mask():
    vocab = {"[PAD]": 0, "[UNK]": 1, "[CLS]": 2, "[SEP]": 3, "ab": 4, "c": 5}
    result = ex.encode("abc", vocab, [("a", "b")])
    assert result["tokens"] == ["[CLS]", "ab", "c", "[SEP]"]
    assert result["input_ids"] == [2, 4, 5, 3]
    assert result["attention_mask"] == [1, 1, 1, 1]


# test_encode_unknown_subword が要求仕様を満たすか確認する。
def test_encode_unknown_subword():
    vocab = {"[UNK]": 1, "[CLS]": 2, "[SEP]": 3}
    assert ex.encode("x", vocab, [])["input_ids"] == [2, 1, 3]
