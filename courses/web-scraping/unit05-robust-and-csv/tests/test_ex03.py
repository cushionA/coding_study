from conftest import load_exercise

ex = load_exercise("ex03_write_csv")


# write_records_to_csvは指定したfieldnames順でヘッダと各行を書き出す
def test_write_records_to_csv_basic(tmp_path):
    rows = [
        {"name": "エチオピア イルガチェフェ", "price": 1200, "stock": 12},
        {"name": "グアテマラ アンティグア", "price": 980, "stock": 0},
    ]
    path = tmp_path / "out.csv"
    ex.write_records_to_csv(rows, ["name", "price", "stock"], path)

    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()
    assert lines[0] == "name,price,stock"
    assert lines[1] == "エチオピア イルガチェフェ,1200,12"


# rowsが空でもヘッダ行だけは書き出す(境界値)
def test_write_records_to_csv_empty_rows(tmp_path):
    path = tmp_path / "empty.csv"
    ex.write_records_to_csv([], ["name", "price"], path)
    content = path.read_text(encoding="utf-8")
    assert content.strip() == "name,price"


# read_records_from_csvはwrite_records_to_csvで書いた内容を往復して復元できる
def test_write_then_read_roundtrip(tmp_path):
    rows = [{"name": "ブラジル セラード", "price": "1500", "stock": "7"}]
    path = tmp_path / "roundtrip.csv"
    ex.write_records_to_csv(rows, ["name", "price", "stock"], path)

    result = ex.read_records_from_csv(path)
    assert result == rows


# UTF-8の日本語が文字化けせず書き込まれる
def test_write_records_to_csv_utf8_japanese(tmp_path):
    rows = [{"name": "コロンビア　ウイラ", "price": "1000"}]
    path = tmp_path / "utf8.csv"
    ex.write_records_to_csv(rows, ["name", "price"], path)

    result = ex.read_records_from_csv(path)
    assert result[0]["name"] == "コロンビア　ウイラ"
