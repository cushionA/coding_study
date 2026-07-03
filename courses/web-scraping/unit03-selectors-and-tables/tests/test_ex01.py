from conftest import load_exercise

ex = load_exercise("ex01_css_select")


def _load_products_soup():
    return ex.load_soup("products.html")


# get_all_product_names は5件の商品名を出現順で返す
def test_get_all_product_names_basic():
    soup = _load_products_soup()
    names = ex.get_all_product_names(soup)
    assert names == [
        "エチオピア モカ",
        "ブラジル サントス",
        "グアテマラ アンティグア",
        "マンデリン",
        "キリマンジャロ",
    ]


# get_all_product_names は件数がフィクスチャの商品カード数と一致する(境界確認)
def test_get_all_product_names_count():
    soup = _load_products_soup()
    assert len(ex.get_all_product_names(soup)) == 5


# get_all_product_prices は価格テキストをそのまま(円付き)で返す
def test_get_all_product_prices_basic():
    soup = _load_products_soup()
    prices = ex.get_all_product_prices(soup)
    assert prices[0] == "1200円"
    assert prices[-1] == "1600円"


# get_first_product_name は最初の1件だけを返す(先頭固定)
def test_get_first_product_name_basic():
    soup = _load_products_soup()
    assert ex.get_first_product_name(soup) == "エチオピア モカ"
