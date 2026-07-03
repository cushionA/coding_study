from conftest import load_exercise

ex = load_exercise("ex02_fetch_details")


# parse_item_detail は生テキストのまま各フィールドを辞書に詰める
def test_parse_item_detail_basic():
    html = ex.fetch(ex.BASE_URL + "item_1.html")
    detail = ex.parse_item_detail(html)
    assert detail["name"] == "エチオピア モカ"
    assert detail["price"] == "1200円"
    assert detail["origin"] == "産地: エチオピア"
    assert detail["roast"] == "焙煎度: 浅煎り"
    assert detail["stock"] == "在庫あり"
    assert "モカ" in detail["description"]


# 在庫切れの商品でも同じキー構成で取得できる(エッジケース)
def test_parse_item_detail_out_of_stock():
    html = ex.fetch(ex.BASE_URL + "item_3.html")
    detail = ex.parse_item_detail(html)
    assert detail["stock"] == "在庫切れ"
    assert detail["name"] == "グアテマラ アンティグア"


# fetch_all_item_details は渡した順序を保って複数件をまとめて返す
def test_fetch_all_item_details_multiple():
    urls = [ex.BASE_URL + "item_1.html", ex.BASE_URL + "item_2.html"]
    details = ex.fetch_all_item_details(urls)
    assert len(details) == 2
    assert details[0]["name"] == "エチオピア モカ"
    assert details[1]["name"] == "ブラジル サントス"


# fetch_all_item_details は空リストなら空リストを返す(境界値)
def test_fetch_all_item_details_empty():
    assert ex.fetch_all_item_details([]) == []
