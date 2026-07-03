from bs4 import BeautifulSoup

from conftest import load_exercise

ex = load_exercise("ex01_find_basic")


def _load_blog_soup():
    return ex.load_soup("blog_post.html")


# load_soup はBeautifulSoupオブジェクトを返す
def test_load_soup_returns_beautifulsoup():
    soup = _load_blog_soup()
    assert isinstance(soup, BeautifulSoup)


# get_title_text は最初のh1のテキストを前後空白なしで返す
def test_get_title_text_basic():
    soup = _load_blog_soup()
    assert ex.get_title_text(soup) == "秋の新作ブレンドができるまで"


# get_first_tag_name はツリー内で最初に現れるタグ名を返す(htmlタグが最初)
def test_get_first_tag_name_basic():
    soup = _load_blog_soup()
    assert ex.get_first_tag_name(soup) == "html"


# 別フィクスチャでも同じ関数が動く(汎用性の確認)
def test_get_first_tag_name_other_fixture():
    soup = ex.load_soup("nested.html")
    assert ex.get_first_tag_name(soup) == "html"
