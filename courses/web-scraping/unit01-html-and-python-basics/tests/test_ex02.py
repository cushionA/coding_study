from conftest import load_exercise

ex = load_exercise("ex02_list_dict")


# long_words_upper は5文字以上の要素だけ大文字化して返す
def test_long_words_upper_basic():
    result = ex.long_words_upper(["cafe", "polaris", "tea", "roast"])
    assert result == ["POLARIS", "ROAST"]


# 該当する要素がなければ空リスト(境界値)
def test_long_words_upper_none_match():
    assert ex.long_words_upper(["a", "bb", "ccc"]) == []


# count_tags はタグごとの出現回数を数える
def test_count_tags_basic():
    result = ex.count_tags(["浅煎り", "焙煎", "浅煎り"])
    assert result == {"浅煎り": 2, "焙煎": 1}


# 空リストなら空の辞書(境界値)
def test_count_tags_empty():
    assert ex.count_tags([]) == {}


# most_common_tag は出現回数最多のタグ名を返す(デフォルトmost=1)
def test_most_common_tag_top1():
    counts = {"焙煎": 3, "浅煎り": 1, "深煎り": 1}
    assert ex.most_common_tag(counts) == "焙煎"


# most_common_tag は同数の場合タグ名の昇順で順位を決める
def test_most_common_tag_tie_break_by_name():
    counts = {"焙煎": 1, "浅煎り": 1}
    assert ex.most_common_tag(counts, most=1) == "浅煎り"
    assert ex.most_common_tag(counts, most=2) == "焙煎"


# unique_tags は出現回数1のタグ名だけを昇順で返す
def test_unique_tags_basic():
    counts = {"焙煎": 2, "浅煎り": 1, "深煎り": 1}
    assert ex.unique_tags(counts) == ["深煎り", "浅煎り"]
