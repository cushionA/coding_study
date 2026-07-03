from conftest import load_exercise

ex = load_exercise("ex02_error_handling")


# safe_int は正常な数値文字列をintに変換する
def test_safe_int_basic():
    assert ex.safe_int("12") == 12


# 変換できない文字列はdefaultを返す(境界値)
def test_safe_int_invalid_returns_default():
    assert ex.safe_int("N/A", default=-1) == -1


# defaultを省略した場合は0
def test_safe_int_default_zero():
    assert ex.safe_int("", default=0) == 0


# extract_field はキーが存在し値もある場合そのまま返す
def test_extract_field_basic():
    record = {"name": "エチオピア", "stock": "12"}
    assert ex.extract_field(record, "name") == "エチオピア"


# キーが無い/値が空文字列/値がNoneはいずれもdefaultになる(境界値)
def test_extract_field_missing_or_empty():
    assert ex.extract_field({}, "stock", default=0) == 0
    assert ex.extract_field({"stock": ""}, "stock", default=0) == 0
    assert ex.extract_field({"stock": None}, "stock", default=0) == 0


# retry_with_backoff は成功するまで再試行し、sleep_fnを注入すれば実待機しない
def test_retry_with_backoff_succeeds_after_failures():
    calls = {"count": 0}

    def flaky():
        calls["count"] += 1
        if calls["count"] < 3:
            raise ValueError("一時的な失敗")
        return "ok"

    sleeps = []
    result = ex.retry_with_backoff(
        flaky,
        max_retries=5,
        base_delay=0.1,
        sleep_fn=sleeps.append,
        jitter_fn=lambda: 0,
    )
    assert result == "ok"
    assert calls["count"] == 3
    assert len(sleeps) == 2


# 上限を超えて失敗し続けたら最後の例外を送出する(境界値)
def test_retry_with_backoff_raises_after_max_retries():
    def always_fails():
        raise ValueError("だめ")

    sleeps = []
    try:
        ex.retry_with_backoff(
            always_fails,
            max_retries=2,
            base_delay=0.1,
            sleep_fn=sleeps.append,
            jitter_fn=lambda: 0,
        )
        assert False, "例外が送出されるはず"
    except ValueError:
        pass
    assert len(sleeps) == 2
