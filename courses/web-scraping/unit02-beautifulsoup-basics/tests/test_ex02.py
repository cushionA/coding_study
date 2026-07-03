from conftest import load_exercise

ex = load_exercise("ex02_findall_loop")


def _load_nav_soup():
    return ex.load_soup("link_list.html")


# get_all_link_texts はaタグのテキストを出現順にすべて集める
def test_get_all_link_texts_basic():
    soup = _load_nav_soup()
    result = ex.get_all_link_texts(soup)
    assert result == ["ホーム", "メニュー", "焙煎日記", "予約", "アクセス", "口コミサイト"]


# aタグが1件しかないページでも正しく1件のリストを返す(境界値)
def test_get_all_link_texts_single():
    soup = ex.load_soup("blog_post.html")
    result = ex.get_all_link_texts(soup)
    assert result == ["この記事の詳細ページへ"]


# count_list_items はliタグの個数を数える
def test_count_list_items_basic():
    soup = _load_nav_soup()
    assert ex.count_list_items(soup) == 6


# liタグがなければ0件(境界値)
def test_count_list_items_zero():
    soup = ex.load_soup("blog_post.html")
    assert ex.count_list_items(soup) == 0


# get_external_link_texts はclass="external"を含むaタグだけを絞り込む
def test_get_external_link_texts_basic():
    soup = _load_nav_soup()
    assert ex.get_external_link_texts(soup) == ["口コミサイト"]
