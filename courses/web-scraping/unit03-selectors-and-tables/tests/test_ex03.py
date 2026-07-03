from conftest import load_exercise

ex = load_exercise("ex03_records_cleanup")


def _load_messy_soup():
    return ex.load_soup("messy_list.html")


# get_item_name は名前が存在する要素からテキストを取り出す
def test_get_item_name_present():
    soup = _load_messy_soup()
    items = soup.select(".item")
    assert ex.get_item_name(items[0]) == "ハンドドリップ エチオピア"


# get_item_name は名前が欠けている要素で "(名称不明)" を返す(欠損対策)
def test_get_item_name_missing():
    soup = _load_messy_soup()
    items = soup.select(".item")
    # 4件目(index 3)はitem-nameを持たない
    assert ex.get_item_name(items[3]) == "(名称不明)"


# get_item_price は価格が欠けている要素で None を返す(欠損対策)
def test_get_item_price_missing():
    soup = _load_messy_soup()
    items = soup.select(".item")
    # 2件目(index 1)はitem-priceを持たない
    assert ex.get_item_price(items[1]) is None


# get_item_price は価格が存在する要素からテキストを取り出す
def test_get_item_price_present():
    soup = _load_messy_soup()
    items = soup.select(".item")
    assert ex.get_item_price(items[0]) == "650円"


# collect_items は class="item item-featured" のような複数クラスの要素も含め、
# フィクスチャ全5件を辞書のリストとして返す
def test_collect_items_count_and_featured():
    soup = _load_messy_soup()
    result = ex.collect_items(soup)
    assert len(result) == 5
    assert result[2] == {"name": "季節のブレンド", "price": "700円"}
    assert result[1] == {"name": "カフェラテ", "price": None}
    assert result[3] == {"name": "(名称不明)", "price": "550円"}
