from conftest import load_exercise

ex = load_exercise("ex04_capstone")


def _load_profile_html():
    return ex.read_fixture("profile_card.html")


# parse_profile はname/job/tagsを持つ辞書を返す
def test_parse_profile_basic():
    html = _load_profile_html()
    profile = ex.parse_profile(html)
    assert profile == {
        "name": "田中 美咲",
        "job": "焙煎士",
        "tags": ["焙煎", "ハンドドリップ", "浅煎り"],
    }


# aggregate_tag_counts は複数プロフィールのタグを横断して数える
def test_aggregate_tag_counts_basic():
    profiles = [
        {"name": "A", "job": "x", "tags": ["焙煎", "浅煎り"]},
        {"name": "B", "job": "y", "tags": ["焙煎", "深煎り"]},
    ]
    result = ex.aggregate_tag_counts(profiles)
    assert result == {"焙煎": 2, "浅煎り": 1, "深煎り": 1}


# プロフィールが1件もなければ空の辞書(境界値)
def test_aggregate_tag_counts_empty():
    assert ex.aggregate_tag_counts([]) == {}


# format_profile_line は指定フォーマットの1行文字列を作る
def test_format_profile_line_basic():
    profile = {"name": "田中 美咲", "job": "焙煎士", "tags": ["焙煎", "ハンドドリップ", "浅煎り"]}
    result = ex.format_profile_line(profile)
    assert result == "田中 美咲(焙煎士) - タグ: 焙煎, ハンドドリップ, 浅煎り"


# フィクスチャから読んだプロフィールでも通しで動く(統合確認)
def test_end_to_end_with_fixture():
    html = _load_profile_html()
    profile = ex.parse_profile(html)
    line = ex.format_profile_line(profile)
    assert line == "田中 美咲(焙煎士) - タグ: 焙煎, ハンドドリップ, 浅煎り"
