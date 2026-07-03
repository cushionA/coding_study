import sys
from pathlib import Path

import pytest
from conftest import load_exercise

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
if str(_DATA_DIR) not in sys.path:
    sys.path.insert(0, str(_DATA_DIR))

from fake_responses import (  # noqa: E402
    make_ok_response,
    make_not_found_response,
    make_rate_limited_response,
    FakeHTTPError,
)

ex = load_exercise("ex01_parse_response")


# get_body_if_ok: 200応答ならtextをそのまま返す
def test_get_body_if_ok_success():
    response = make_ok_response("<h1>hello</h1>")
    assert ex.get_body_if_ok(response) == "<h1>hello</h1>"


# get_body_if_ok: 404応答ならNoneを返す(エッジケース)
def test_get_body_if_ok_failure():
    response = make_not_found_response()
    assert ex.get_body_if_ok(response) is None


# get_content_type: Content-Typeヘッダがあればその値を返す
def test_get_content_type_present():
    response = make_ok_response("<p>x</p>")
    assert ex.get_content_type(response) == "text/html; charset=utf-8"


# get_content_type: ヘッダが無いレスポンスでは"unknown"を返す(エッジケース)
def test_get_content_type_missing():
    response = make_ok_response("x")
    response.headers = {}
    assert ex.get_content_type(response) == "unknown"


# count_by_status: 複数レスポンスのstatus_codeごとの件数を数える
def test_count_by_status_basic():
    responses = [make_ok_response("a"), make_ok_response("b"), make_not_found_response()]
    result = ex.count_by_status(responses)
    assert result == {200: 2, 404: 1}


# get_body_or_raise: 成功時はtextを返す
def test_get_body_or_raise_success():
    response = make_ok_response("body-text")
    assert ex.get_body_or_raise(response) == "body-text"


# get_body_or_raise: 429など失敗時は例外を送出する
def test_get_body_or_raise_error():
    response = make_rate_limited_response(retry_after_seconds=3)
    with pytest.raises(FakeHTTPError):
        ex.get_body_or_raise(response)
