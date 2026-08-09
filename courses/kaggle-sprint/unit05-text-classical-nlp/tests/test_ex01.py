from conftest import load_exercise

ex = load_exercise("ex01_clean_and_normalize")


# entityを戻しタグ位置で語が連結しない
def test_remove_html_noise_entities_and_tags():
    result = ex.remove_html_noise("A&amp;B<br>送料無料")
    assert "&" in result
    assert "<br>" not in result
    assert "B送料無料" not in result


# 全角英数・大文字・空白のゆれをまとめる
def test_normalize_unicode_space():
    assert ex.normalize_unicode_space("  ＸＲ－５００Ｂ\n\t TEST  ") == "xr-500b test"


# 4種類の価格表記を同じトークンへする
def test_replace_price_variants():
    for text in ["1,980円", "¥1980", "1980 円", "1980JPY"]:
        assert ex.replace_price(text) == "<num>"


# clean_textは型番を残しつつHTMLと価格を整える
def test_clean_text_preserves_model_code():
    result = ex.clean_text("<b>ＸＲ－５００Ｂ</b> &amp; ¥1980")
    assert "xr-500b" in result
    assert "<num>" in result
    assert "<b>" not in result
