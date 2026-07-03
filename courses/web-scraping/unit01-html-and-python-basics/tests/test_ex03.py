from conftest import load_exercise

ex = load_exercise("ex03_html_skim")


# read_fixture がsimple_page.htmlを読み込めることを前提に使う
def _load_simple_page():
    return ex.read_fixture("simple_page.html")


# extract_between はタグに挟まれた最初のテキストを取り出す
def test_extract_between_basic():
    html = _load_simple_page()
    assert ex.extract_between(html, "<h1>", "</h1>") == "喫茶ポラリス"


# 見つからないタグを渡すとNone(境界値)
def test_extract_between_not_found():
    html = _load_simple_page()
    assert ex.extract_between(html, "<h3>", "</h3>") is None


# extract_href_list はhrefの値を出現順にすべて集める
def test_extract_href_list_basic():
    html = _load_simple_page()
    assert ex.extract_href_list(html) == ["/menu", "/reserve", "/access"]


# aタグがなければ空リスト(境界値)
def test_extract_href_list_no_links():
    html = "<html><body><p>リンクなし</p></body></html>"
    assert ex.extract_href_list(html) == []


# extract_paragraphs は<p>...</p>のテキストを出現順にすべて集める
def test_extract_paragraphs_basic():
    html = _load_simple_page()
    result = ex.extract_paragraphs(html)
    assert len(result) == 4
    assert result[0] == "営業時間: 8:00-19:00 / 定休日: 水曜"
    assert result[3] == "お問い合わせ: info@example-cafe.test"
