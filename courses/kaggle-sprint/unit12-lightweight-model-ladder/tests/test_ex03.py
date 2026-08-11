import re
from pathlib import Path

from conftest import load_exercise
import pandas as pd
import pytest

ex = load_exercise("ex03_rule_vs_tagger")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# 段0 の正規表現。最初に書く1本 → 新しい書式が現れて継ぎ足す、という順で増えていく
PAT_A = re.compile(r"[A-Za-z][0-9]{3}-?[0-9]{2}")     # A340-57 / A34057
PAT_B = re.compile(r"[A-Za-z]{2}-?[0-9]{4}")          # AB-1234 / AB1234


# detect_format: 3つの書式をそれぞれ正しく判定する
def test_detect_format_known_formats():
    assert ex.detect_format("A340-57") == "A999-99"
    assert ex.detect_format("AB-1234") == "AA-9999"
    assert ex.detect_format("1234-XY") == "9999-AA"


# detect_format: 当てはまらないものは "other"(空文字も含む)
def test_detect_format_other():
    assert ex.detect_format("") == "other"
    assert ex.detect_format("ZZ99") == "other"
    assert ex.detect_format("A340-577") == "other", (
        "数字が3桁多い。search ではなく全体の一致で判定しないと A340-57 として通ってしまう"
    )


# rule_extract: 素直な綴りと全角の綴りの両方から取れる
def test_rule_extract_normalizes_fullwidth():
    assert ex.rule_extract("アカネ電機 A340-57 ブラック 掃除機", [PAT_A]) == "A340-57"
    assert ex.rule_extract("アカネ電機 Ａ３４０－５７ ブラック", [PAT_A]) == "A340-57", (
        "全角のままでは正規表現が当たらない。先に半角へ正規化する"
    )


# rule_extract: ハイフンが落ちた綴りは正規形に戻して返す
def test_rule_extract_restores_hyphen():
    assert ex.rule_extract("A34057ホワイト腕時計", [PAT_A]) == "A340-57"


# rule_extract: 当たらなければ空文字。patterns は先頭から順に試す
def test_rule_extract_no_match_and_order():
    assert ex.rule_extract("ソライロ ブラック 冷蔵庫", [PAT_A]) == ""
    assert ex.rule_extract("AB-1234 ネイビー", [PAT_A]) == "", (
        "1本目の正規表現しか渡していないので、別書式は拾えないのが正しい"
    )
    assert ex.rule_extract("AB-1234 ネイビー", [PAT_A, PAT_B]) == "AB-1234"


# exact_match_by_format: 書式ごとに件数と一致率が分かれる
def test_exact_match_by_format_basic():
    golds = ["A340-57", "A100-11", "AB-1234", "AB-5678", "1234-XY"]
    preds = ["A340-57", "", "AB-1234", "AB-9999", ""]

    table = ex.exact_match_by_format(preds, golds)

    assert isinstance(table, pd.DataFrame)
    assert table.shape == (3, 2), "書式3種類 × ['n', 'exact_match'] の表になるはず"
    assert list(table.index) == ["9999-AA", "A999-99", "AA-9999"], "index は書式名の昇順"
    assert list(table.columns) == ["n", "exact_match"]
    assert table.loc["A999-99", "n"] == 2
    assert table.loc["A999-99", "exact_match"] == pytest.approx(0.5), "2件中1件が完全一致"
    assert table.loc["AA-9999", "exact_match"] == pytest.approx(0.5)
    assert table.loc["9999-AA", "exact_match"] == pytest.approx(0.0), (
        "1件も当たっていない書式も 0.0 として行が残る(行ごと消えてはいけない)"
    )


# compare_methods: 手法 × 書式 の表になる
def test_compare_methods_shape_and_values():
    golds = ["A340-57", "AB-1234", "AB-5678"]
    preds_by_method = {
        "rule_1pattern": ["A340-57", "", ""],
        "rule_2patterns": ["A340-57", "AB-1234", "AB-5678"],
    }

    table = ex.compare_methods(preds_by_method, golds)

    assert table.shape == (2, 2), "手法2つ × 書式2種類"
    assert list(table.index) == ["rule_1pattern", "rule_2patterns"], "index は手法名"
    assert list(table.columns) == ["A999-99", "AA-9999"], "列は書式名の昇順"
    assert table.loc["rule_1pattern", "AA-9999"] == pytest.approx(0.0)
    assert table.loc["rule_2patterns", "AA-9999"] == pytest.approx(1.0)
    assert table.loc["rule_1pattern", "A999-99"] == pytest.approx(1.0)


# 実データ: train に入っている書式は2種類だけ(3種類目は test にしか出ない)
def test_train_has_only_two_formats():
    train = pd.read_csv(DATA_DIR / "ner_train.csv")
    assert train.shape == (3200, 7)

    fmts = pd.Series([ex.detect_format(c) for c in train["model_code"]]).value_counts()

    assert set(fmts.index) == {"A999-99", "AA-9999"}, (
        "train に出るのは A999-99 と AA-9999 の2書式。9999-AA が出るなら test 側を読んでいる"
    )
    assert int(fmts.sum()) == 3200


# 実データ: 正規表現の継ぎ足しは、新しい書式にだけ効いて既存の書式を壊さない
def test_rule_ladder_on_real_titles():
    train = pd.read_csv(DATA_DIR / "ner_train.csv")
    titles, golds = train["title"], train["model_code"]

    one = [ex.rule_extract(t, [PAT_A]) for t in titles]
    two = [ex.rule_extract(t, [PAT_A, PAT_B]) for t in titles]
    table = ex.compare_methods({"1pattern": one, "2patterns": two}, golds)

    assert table.shape == (2, 2)
    assert table.loc["1pattern", "AA-9999"] == pytest.approx(0.0), (
        "1本目の正規表現は A999-99 用なので、AA-9999 は1件も当たらないのが正しい"
    )
    assert table.loc["2patterns", "AA-9999"] > 0.5, (
        "2本目を足したら AA-9999 が拾えるはず。0 のままなら patterns を順に試せていない"
    )
    assert table.loc["2patterns", "A999-99"] == pytest.approx(
        table.loc["1pattern", "A999-99"]
    ), "継ぎ足しても既存書式の成績は変わらない(先頭の正規表現から順に試すため)"
    assert table.loc["1pattern", "A999-99"] > 0.5
