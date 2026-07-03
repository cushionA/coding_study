import csv

from conftest import load_exercise

ex = load_exercise("ex03_pipeline_integrate")


# strip_label は "ラベル: 値" から値だけを取り出す
def test_strip_label_basic():
    assert ex.strip_label("産地: エチオピア") == "エチオピア"


# strip_label はコロンが無ければそのまま返す(境界値)
def test_strip_label_no_colon():
    assert ex.strip_label("在庫あり") == "在庫あり"


# price_to_int は円記号を除去してintにする
def test_price_to_int_basic():
    assert ex.price_to_int("1200円") == 1200


# clean_item は生の辞書をidつきの整形済み辞書に変換する
def test_clean_item_basic():
    raw = {
        "name": "エチオピア モカ",
        "price": "1200円",
        "origin": "産地: エチオピア",
        "roast": "焙煎度: 浅煎り",
        "stock": "在庫あり",
        "description": "説明文",
    }
    result = ex.clean_item(1, raw)
    assert result == {
        "id": 1,
        "name": "エチオピア モカ",
        "price": 1200,
        "origin": "エチオピア",
        "roast": "浅煎り",
        "stock": "在庫あり",
        "description": "説明文",
    }


# write_catalog_csv はヘッダ+データ行をUTF-8で書き出す
def test_write_catalog_csv_roundtrip(tmp_path):
    rows = [
        {"id": 1, "name": "エチオピア モカ", "price": 1200, "origin": "エチオピア",
         "roast": "浅煎り", "stock": "在庫あり", "description": "説明文"},
    ]
    output_path = tmp_path / "out.csv"
    ex.write_catalog_csv(rows, output_path)

    with open(output_path, encoding="utf-8", newline="") as f:
        reader = list(csv.DictReader(f))
    assert len(reader) == 1
    assert reader[0]["name"] == "エチオピア モカ"
    assert reader[0]["price"] == "1200"
