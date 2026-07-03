from conftest import load_exercise

ex = load_exercise("ex01_string_extract")


# clean_whitespace は前後の空白・改行を取り除く
def test_clean_whitespace_basic():
    assert ex.clean_whitespace("  こんにちは  \n") == "こんにちは"


# 前後に何もない文字列はそのまま返る(境界値)
def test_clean_whitespace_no_padding():
    assert ex.clean_whitespace("そのまま") == "そのまま"


# split_tags はカンマ区切りを前後空白なしのリストにする
def test_split_tags_basic():
    result = ex.split_tags("焙煎, ハンドドリップ, 浅煎り")
    assert result == ["焙煎", "ハンドドリップ", "浅煎り"]


# 要素が1つだけでも動く(境界値)
def test_split_tags_single():
    assert ex.split_tags("焙煎") == ["焙煎"]


# extract_value は最初のコロンの後ろの値を前後空白なしで返す
def test_extract_value_basic():
    assert ex.extract_value("営業時間: 8:00-19:00") == "8:00-19:00"


# ラベル側にコロンがなくても値部分にコロンが複数あっても壊れない
def test_extract_value_multiple_colons_in_value():
    assert ex.extract_value("受付: 10:30") == "10:30"


# format_summary は指定フォーマットの文字列を組み立てる
def test_format_summary_basic():
    assert ex.format_summary("田中 美咲", "焙煎士") == "名前: 田中 美咲 / 職業: 焙煎士"
