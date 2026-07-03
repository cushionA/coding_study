import csv

from conftest import load_exercise

ex = load_exercise("ex04_capstone")


def _dirty_html():
    return ex.read_fixture("dirty_records.html")


def _expected_rows():
    path = ex.DATA_DIR / "expected_output.csv"
    with open(path, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# extract_record_blocksは<li class="record">ブロックを出現順にすべて取り出す(5件)
def test_extract_record_blocks_count():
    blocks = ex.extract_record_blocks(_dirty_html())
    assert len(blocks) == 5


# parse_recordは1件分の生ブロックをクレンジング済み辞書にする
def test_parse_record_basic():
    blocks = ex.extract_record_blocks(_dirty_html())
    record = ex.parse_record(blocks[0])
    assert record == {
        "name": "エチオピア イルガチェフェ",
        "price": 1200,
        "date": "2024-01-05",
        "stock": 12,
    }


# nameが空欄のレコードはValueErrorになる(境界値)
def test_parse_record_missing_name_raises():
    blocks = ex.extract_record_blocks(_dirty_html())
    try:
        ex.parse_record(blocks[3])
        assert False, "ValueErrorが送出されるはず"
    except ValueError:
        pass


# priceが空欄のレコードもValueErrorになる(境界値)
def test_parse_record_missing_price_raises():
    blocks = ex.extract_record_blocks(_dirty_html())
    try:
        ex.parse_record(blocks[4])
        assert False, "ValueErrorが送出されるはず"
    except ValueError:
        pass


# build_clean_recordsは壊れたレコードをスキップし、expected_output.csvと一致する結果を返す
def test_build_clean_records_matches_expected():
    records = ex.build_clean_records(_dirty_html())
    expected = _expected_rows()

    assert len(records) == len(expected)
    for record, exp in zip(records, expected):
        assert record["name"] == exp["name"]
        assert str(record["price"]) == exp["price"]
        assert record["date"] == exp["date"]
        assert str(record["stock"]) == exp["stock"]


# export_to_csvで書き出したファイルはexpected_output.csvと同じ内容になる
def test_export_to_csv_matches_expected_file(tmp_path):
    records = ex.build_clean_records(_dirty_html())
    out_path = tmp_path / "out.csv"
    ex.export_to_csv(records, out_path)

    with open(out_path, "r", encoding="utf-8", newline="") as f:
        actual_rows = list(csv.DictReader(f))
    expected_rows = _expected_rows()

    assert len(actual_rows) == len(expected_rows)
    for actual, expected in zip(actual_rows, expected_rows):
        assert actual == expected
