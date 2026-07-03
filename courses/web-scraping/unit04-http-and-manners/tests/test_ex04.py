import sys
from pathlib import Path

from conftest import load_exercise

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
if str(_DATA_DIR) not in sys.path:
    sys.path.insert(0, str(_DATA_DIR))

from fake_responses import make_ok_response, make_not_found_response, make_rate_limited_response  # noqa: E402

ex = load_exercise("ex04_capstone")


class _SleepRecorder:
    def __init__(self):
        self.calls = []

    def __call__(self, seconds):
        self.calls.append(seconds)


def _load_robots_text():
    return (Path(_DATA_DIR) / "example_robots.txt").read_text(encoding="utf-8")


def _load_ok_html():
    return (Path(_DATA_DIR) / "response_ok.html").read_text(encoding="utf-8")


# get_body_with_retry: 200応答ならそのままtextを返す(再取得しない)
def test_get_body_with_retry_success_no_retry():
    recorder = _SleepRecorder()
    html = _load_ok_html()
    response = make_ok_response(html)

    def fetch_func():
        raise AssertionError("成功時はfetch_funcを呼び直すべきではない")

    result = ex.get_body_with_retry(response, fetch_func=fetch_func, sleep_func=recorder)
    assert result == html
    assert recorder.calls == []


# get_body_with_retry: 429なら1回だけ待って再取得し、成功すればその本文を返す
def test_get_body_with_retry_retries_after_429():
    recorder = _SleepRecorder()
    html = _load_ok_html()
    first_response = make_rate_limited_response(retry_after_seconds=4)
    second_response = make_ok_response(html)

    def fetch_func():
        return second_response

    result = ex.get_body_with_retry(first_response, fetch_func=fetch_func, sleep_func=recorder)
    assert result == html
    assert recorder.calls == [4.0]


# get_body_with_retry: 404など429以外の失敗はNoneを返す(例外を投げない)
def test_get_body_with_retry_returns_none_on_404():
    recorder = _SleepRecorder()
    response = make_not_found_response()

    def fetch_func():
        raise AssertionError("404はリトライ対象ではない")

    result = ex.get_body_with_retry(response, fetch_func=fetch_func, sleep_func=recorder)
    assert result is None
    assert recorder.calls == []


# fetch_if_allowed: robots.txtで禁止されたパスは取得を試みずNoneを返す
def test_fetch_if_allowed_skips_disallowed_path():
    recorder = _SleepRecorder()
    rp = ex.build_robots_parser(_load_robots_text())

    def fetch_func():
        raise AssertionError("禁止パスではfetch_funcを呼ぶべきではない")

    result = ex.fetch_if_allowed(rp, "*", "/admin/secret", fetch_func=fetch_func, sleep_func=recorder)
    assert result is None
    assert recorder.calls == []


# fetch_if_allowed: 許可されたパスなら取得して本文を返す(統合確認)
def test_fetch_if_allowed_fetches_when_permitted():
    recorder = _SleepRecorder()
    rp = ex.build_robots_parser(_load_robots_text())
    html = _load_ok_html()

    def fetch_func():
        return make_ok_response(html)

    result = ex.fetch_if_allowed(rp, "*", "/public/page", fetch_func=fetch_func, sleep_func=recorder)
    assert result == html
