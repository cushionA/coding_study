import sys
from pathlib import Path

from conftest import load_exercise

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"
if str(_DATA_DIR) not in sys.path:
    sys.path.insert(0, str(_DATA_DIR))

from fake_responses import make_ok_response, make_rate_limited_response  # noqa: E402

ex = load_exercise("ex03_rate_limit")


class _SleepRecorder:
    # time.sleepの代わりに「何秒待とうとしたか」を記録するだけのダミー(実際には待たない)
    def __init__(self):
        self.calls = []

    def __call__(self, seconds):
        self.calls.append(seconds)


# wait_if_needed: 経過時間が足りなければ不足分だけsleep_funcを呼ぶ
def test_wait_if_needed_waits_when_too_soon():
    recorder = _SleepRecorder()
    waited = ex.wait_if_needed(now=10.0, last_called_at=9.5, min_interval=2.0, sleep_func=recorder)
    assert waited == 1.5
    assert recorder.calls == [1.5]


# wait_if_needed: 十分に間隔が空いていればsleep_funcを呼ばない(エッジケース)
def test_wait_if_needed_no_wait_when_enough_elapsed():
    recorder = _SleepRecorder()
    waited = ex.wait_if_needed(now=10.0, last_called_at=5.0, min_interval=2.0, sleep_func=recorder)
    assert waited == 0
    assert recorder.calls == []


# handle_rate_limit: 429応答ならRetry-Afterの秒数だけ待ち、Trueを返す
def test_handle_rate_limit_retries_on_429():
    recorder = _SleepRecorder()
    response = make_rate_limited_response(retry_after_seconds=7)
    should_retry = ex.handle_rate_limit(response, sleep_func=recorder)
    assert should_retry is True
    assert recorder.calls == [7.0]


# handle_rate_limit: 200応答なら何もせずFalseを返す
def test_handle_rate_limit_ignores_ok_response():
    recorder = _SleepRecorder()
    response = make_ok_response("body")
    should_retry = ex.handle_rate_limit(response, sleep_func=recorder)
    assert should_retry is False
    assert recorder.calls == []


# fetch_all_with_delay: 複数URLを順番に取得し、2件目以降の前にだけ待つ
def test_fetch_all_with_delay_waits_between_calls():
    recorder = _SleepRecorder()
    urls = ["a", "b", "c"]
    clock_values = iter([0.0, 0.0, 0.2, 0.2, 0.5, 0.5])

    def clock_func():
        return next(clock_values)

    def fetch_func(url):
        return f"body-of-{url}"

    results = ex.fetch_all_with_delay(
        urls, fetch_func=fetch_func, min_interval=1.0, sleep_func=recorder, clock_func=clock_func
    )
    assert results == ["body-of-a", "body-of-b", "body-of-c"]
    # 1件目の前には待たない、2件目・3件目の前には不足分を待つ
    assert len(recorder.calls) == 2
