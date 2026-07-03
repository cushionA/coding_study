from conftest import load_exercise

ex = load_exercise("ex01_collect_links")


# extract_item_links は1ページ目の4件のURLをBASE_URL付きで返す
def test_extract_item_links_page1():
    html = ex.fetch(ex.BASE_URL + "list_page_1.html")
    links = ex.extract_item_links(html)
    assert links == [
        ex.BASE_URL + "item_1.html",
        ex.BASE_URL + "item_2.html",
        ex.BASE_URL + "item_3.html",
        ex.BASE_URL + "item_4.html",
    ]


# extract_item_links は3ページ目の2件(端数ページ)も正しく返す(エッジケース)
def test_extract_item_links_page3_partial():
    html = ex.fetch(ex.BASE_URL + "list_page_3.html")
    links = ex.extract_item_links(html)
    assert links == [
        ex.BASE_URL + "item_9.html",
        ex.BASE_URL + "item_10.html",
    ]


# extract_next_page_url は次ページがあればURLを返す
def test_extract_next_page_url_has_next():
    html = ex.fetch(ex.BASE_URL + "list_page_1.html")
    assert ex.extract_next_page_url(html) == ex.BASE_URL + "list_page_2.html"


# extract_next_page_url は最終ページ(次ページなし)でNoneを返す(境界値)
def test_extract_next_page_url_last_page():
    html = ex.fetch(ex.BASE_URL + "list_page_3.html")
    assert ex.extract_next_page_url(html) is None


# collect_all_item_links は3ページ分を辿って10件を順序通りに集める(統合確認)
def test_collect_all_item_links_all_pages():
    links = ex.collect_all_item_links(ex.BASE_URL + "list_page_1.html")
    assert len(links) == 10
    assert links[0] == ex.BASE_URL + "item_1.html"
    assert links[-1] == ex.BASE_URL + "item_10.html"
