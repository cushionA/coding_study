from conftest import load_exercise

ex = load_exercise("ex02_table_parse")


def _load_stats_soup():
    return ex.load_soup("table_stats.html")


# get_headers は3列の見出しを出現順で返す
def test_get_headers_basic():
    soup = _load_stats_soup()
    assert ex.get_headers(soup) == ["月", "来客数", "売上(円)"]


# get_rows は3行×3列の2次元リストを返す
def test_get_rows_basic():
    soup = _load_stats_soup()
    rows = ex.get_rows(soup)
    assert rows == [
        ["4月", "320", "486000"],
        ["5月", "410", "612500"],
        ["6月", "298", "451200"],
    ]


# get_rows の各行の列数はヘッダ数と一致する(境界確認)
def test_get_rows_column_count_matches_headers():
    soup = _load_stats_soup()
    headers = ex.get_headers(soup)
    rows = ex.get_rows(soup)
    assert all(len(row) == len(headers) for row in rows)


# rows_to_dicts はヘッダをキーにした辞書のリストに変換する
def test_rows_to_dicts_basic():
    headers = ["月", "来客数", "売上(円)"]
    rows = [["4月", "320", "486000"], ["5月", "410", "612500"]]
    result = ex.rows_to_dicts(headers, rows)
    assert result == [
        {"月": "4月", "来客数": "320", "売上(円)": "486000"},
        {"月": "5月", "来客数": "410", "売上(円)": "612500"},
    ]


# rows_to_dicts は行が空リストなら空リストを返す(境界値)
def test_rows_to_dicts_empty_rows():
    assert ex.rows_to_dicts(["月", "来客数", "売上(円)"], []) == []
