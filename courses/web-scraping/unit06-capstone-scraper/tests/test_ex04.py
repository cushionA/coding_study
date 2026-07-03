import csv
from pathlib import Path

from conftest import load_exercise

ex = load_exercise("ex04_capstone")

_EXPECTED_CSV = Path(__file__).resolve().parents[2] / "data" / "site" / "expected_catalog.csv"


def _read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# is_allowed はrobots.txtでDisallowされていないパスをTrueとする
def test_is_allowed_normal_page():
    robots_txt = ex.fetch(ex.BASE_URL + "robots.txt")
    assert ex.is_allowed(robots_txt, ex.BASE_URL + "list_page_1.html") is True


# is_allowed はDisallow配下のパスをFalseとする(境界値)
def test_is_allowed_disallowed_path():
    robots_txt = ex.fetch(ex.BASE_URL + "robots.txt")
    assert ex.is_allowed(robots_txt, ex.BASE_URL + "admin/secret.html") is False


# collect_all_item_links はページ移動のたびにsleep_fnを呼ぶが、実際には待機しない(呼び出し回数だけ確認)
def test_collect_all_item_links_calls_sleep_between_pages():
    calls = []
    links = ex.collect_all_item_links(ex.BASE_URL + "list_page_1.html", lambda: calls.append(1))
    assert len(links) == 10
    # 3ページ→2回のページ送りが発生する
    assert len(calls) == 2


# fetch_and_clean_all は取得できた分だけ整形済み辞書を返し、失敗した1件はon_errorに通知してスキップする
def test_fetch_and_clean_all_skips_failed_item():
    urls = [
        ex.BASE_URL + "item_1.html",
        ex.BASE_URL + "item_does_not_exist.html",
        ex.BASE_URL + "item_2.html",
    ]
    errors = []
    rows = ex.fetch_and_clean_all(urls, lambda d: None, 1, on_error=lambda url, exc: errors.append(url))
    assert len(rows) == 2
    assert len(errors) == 1
    assert errors[0] == ex.BASE_URL + "item_does_not_exist.html"


# run_pipeline は許可されたURLからスタートすると全10件をCSVに書き出し、期待CSVと一致する(統合確認)
def test_run_pipeline_end_to_end_matches_expected_csv(tmp_path):
    output_path = tmp_path / "catalog.csv"
    sleep_calls = []
    rows = ex.run_pipeline(
        ex.BASE_URL + "list_page_1.html", output_path, lambda d: sleep_calls.append(d), crawl_delay=1
    )
    assert len(rows) == 10
    assert len(sleep_calls) > 0

    actual = _read_csv(output_path)
    expected = _read_csv(_EXPECTED_CSV)
    assert len(actual) == len(expected)
    for a, e in zip(actual, expected):
        assert a == e


# run_pipeline はrobots.txtで禁止されたURLから開始すると何も取得せずヘッダのみのCSVを書く
def test_run_pipeline_respects_disallowed_start_url(tmp_path):
    output_path = tmp_path / "catalog.csv"
    rows = ex.run_pipeline(
        ex.BASE_URL + "admin/secret.html", output_path, lambda d: None, crawl_delay=1
    )
    assert rows == []
    actual = _read_csv(output_path)
    assert actual == []
