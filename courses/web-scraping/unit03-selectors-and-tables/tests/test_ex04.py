from conftest import load_exercise

ex = load_exercise("ex04_capstone")


# get_in_stock_products は在庫ありの3件だけを、価格をintにして返す
def test_get_in_stock_products_basic():
    soup = ex.load_soup("products.html")
    result = ex.get_in_stock_products(soup)
    assert result == [
        {"name": "エチオピア モカ", "price": 1200},
        {"name": "ブラジル サントス", "price": 980},
        {"name": "マンデリン", "price": 1350},
    ]


# get_in_stock_products は在庫切れの商品を含まない(フィルタ確認)
def test_get_in_stock_products_excludes_out_of_stock():
    soup = ex.load_soup("products.html")
    names = [p["name"] for p in ex.get_in_stock_products(soup)]
    assert "グアテマラ アンティグア" not in names
    assert "キリマンジャロ" not in names


# total_sales は3ヶ月分の売上を合計したintを返す
def test_total_sales_basic():
    soup = ex.load_soup("table_stats.html")
    assert ex.total_sales(soup) == 486000 + 612500 + 451200


# count_complete_items はname/priceが両方揃っている件数だけを数える
def test_count_complete_items_basic():
    soup = ex.load_soup("messy_list.html")
    # 5件中、名前欠損1件・価格欠損1件を除いた3件が完全
    assert ex.count_complete_items(soup) == 3
