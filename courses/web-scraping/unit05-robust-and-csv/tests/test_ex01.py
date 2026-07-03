from conftest import load_exercise

ex = load_exercise("ex01_clean_fields")


# normalize_whitespace は前後空白除去+内部連続空白の畳み込みを行う
def test_normalize_whitespace_basic():
    assert ex.normalize_whitespace("  エチオピア  イルガチェフェ ") == "エチオピア イルガチェフェ"


# 全角スペースも対象になる
def test_normalize_whitespace_zenkaku():
    assert ex.normalize_whitespace("グアテマラ　アンティグア") == "グアテマラ アンティグア"


# 既に正規化済みの文字列はそのまま(境界値)
def test_normalize_whitespace_already_clean():
    assert ex.normalize_whitespace("ブラジル セラード") == "ブラジル セラード"


# parse_price は通貨記号・カンマを除いてintにする
def test_parse_price_basic():
    assert ex.parse_price("￥1,200") == 1200
    assert ex.parse_price("980円") == 980
    assert ex.parse_price("¥ 1,500") == 1500


# 空文字列・Noneはfallbackとして None を返す(境界値)
def test_parse_price_empty_or_none():
    assert ex.parse_price("") is None
    assert ex.parse_price(None) is None


# normalize_date はスラッシュ・ハイフン・和暦区切りいずれもYYYY-MM-DDに揃える
def test_normalize_date_variants():
    assert ex.normalize_date("2024/1/5") == "2024-01-05"
    assert ex.normalize_date("2024-01-10") == "2024-01-10"
    assert ex.normalize_date("2024年1月15日") == "2024-01-15"
