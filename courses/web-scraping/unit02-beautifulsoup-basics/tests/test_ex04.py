from conftest import load_exercise

ex = load_exercise("ex04_capstone")


# parse_blog_post はtitle/author/date/linkを持つ辞書を返す
def test_parse_blog_post_basic():
    soup = ex.load_soup("blog_post.html")
    result = ex.parse_blog_post(soup)
    assert result == {
        "title": "秋の新作ブレンドができるまで",
        "author": "田中 美咲",
        "date": "2026-10-02",
        "link": "/blog/autumn-blend",
    }


# count_seats_by_floor はフロアごとの座席合計を返す
def test_count_seats_by_floor_basic():
    soup = ex.load_soup("nested.html")
    result = ex.count_seats_by_floor(soup)
    assert result == {"floor-1": 10, "floor-2": 8}


# find_busiest_floor は座席数最大のフロアidを返す
def test_find_busiest_floor_basic():
    assert ex.find_busiest_floor({"floor-1": 10, "floor-2": 8}) == "floor-1"


# フロアが1つだけでもそのフロアを返す(境界値)
def test_find_busiest_floor_single():
    assert ex.find_busiest_floor({"floor-1": 3}) == "floor-1"


# フィクスチャを通しで処理しても矛盾がない(統合確認)
def test_end_to_end_with_fixture():
    soup = ex.load_soup("nested.html")
    seat_counts = ex.count_seats_by_floor(soup)
    busiest = ex.find_busiest_floor(seat_counts)
    assert busiest == "floor-1"
