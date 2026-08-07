from pathlib import Path

from conftest import load_exercise
import numpy as np
import pandas as pd
import pytest

ex = load_exercise("ex04_capstone")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


# clean_train: 実データに対して掃除後の行数・views列のdtypeが正しい
def test_clean_train_shape_and_views_dtype():
    train = pd.read_csv(DATA_DIR / "train.csv")
    assert train.shape == (3040, 9)

    clean = ex.clean_train(train)

    assert clean.shape == (2969, 9), (
        "3040 -> 重複除去(3000) -> price>0(2979) -> price<=1,000,000(2969) の順で減るはず"
    )
    assert clean["views"].dtype == np.float64, "views<0 をNaNに置き換えると列全体がfloat64に昇格する"
    assert (clean["views"] < 0).sum() == 0, "負のviewsが残っている(置換し忘れ)"
    assert clean["views"].isna().sum() > 0, "置換されたNaNが1件も無い(views<0を見つけられていない可能性)"


# category_condition_median_predict: (category,condition)の組が学習側にあれば、その中央値を使う
def test_category_condition_median_predict_exact_match():
    train_part = pd.DataFrame(
        {"category": ["A", "A", "A", "B", "B"], "condition": ["x", "x", "y", "x", "x"], "price": [10, 20, 100, 5, 15]}
    )
    target_df = pd.DataFrame({"category": ["A", "B"], "condition": ["x", "x"]})

    preds = ex.category_condition_median_predict(train_part, target_df)

    assert list(preds) == pytest.approx([15.0, 10.0]), "(A,x)の中央値は15、(B,x)の中央値は10"


# category_condition_median_predict: 3段の退避チェーンが正しく効く
def test_category_condition_median_predict_fallback_chain():
    train_part = pd.DataFrame(
        {"category": ["A", "A", "A", "B", "B"], "condition": ["x", "x", "y", "x", "x"], "price": [10, 20, 100, 5, 15]}
    )
    # A,x -> 完全一致 / A,z -> conditionが未知なのでcategory Aの中央値 / C,x -> categoryごと未知なので全体中央値
    target_df = pd.DataFrame({"category": ["A", "A", "C"], "condition": ["x", "z", "x"]})

    preds = ex.category_condition_median_predict(train_part, target_df)

    assert preds[0] == pytest.approx(15.0), "(A,x)は完全一致(中央値15)"
    assert preds[1] == pytest.approx(20.0), "(A,z)は無いのでcategory=A全体の中央値(10,20,100の中央値=20)に退避"
    assert preds[2] == pytest.approx(15.0), "category=C自体が無いので全体中央値(10,20,100,5,15の中央値=15)に退避"


# validate_submission: 正しい提出は問題なし(空リスト)
def test_validate_submission_ok():
    test_df = pd.DataFrame({"item_id": ["a", "b", "c"]})
    sub = pd.DataFrame({"item_id": ["a", "b", "c"], "price": [1.0, 2.0, 3.0]})
    assert ex.validate_submission(sub, test_df) == []


# validate_submission: 欠損・負値・行数不一致をそれぞれ検出する
def test_validate_submission_detects_problems():
    test_df = pd.DataFrame({"item_id": ["a", "b", "c"]})

    too_few = pd.DataFrame({"item_id": ["a", "b"], "price": [1.0, 2.0]})
    assert len(ex.validate_submission(too_few, test_df)) >= 1, "行数不一致は検出されるべき"

    has_nan = pd.DataFrame({"item_id": ["a", "b", "c"], "price": [1.0, None, 3.0]})
    assert len(ex.validate_submission(has_nan, test_df)) >= 1, "欠損は検出されるべき"

    has_negative = pd.DataFrame({"item_id": ["a", "b", "c"], "price": [1.0, -2.0, 3.0]})
    assert len(ex.validate_submission(has_negative, test_df)) >= 1, "負値は検出されるべき"


# run_capstone: 実データ全体を通して、提出として成立するDataFrameが返る
def test_run_capstone_end_to_end():
    train, test = ex.load_data(data_dir=DATA_DIR)
    assert train.shape == (3040, 9)
    assert test.shape == (1000, 8)

    submission = ex.run_capstone(train, test, valid_frac=0.2, random_state=0)

    assert isinstance(submission, pd.DataFrame)
    assert list(submission.columns) == ["item_id", "price"]
    assert submission.shape == (1000, 2), "test と同じ1000行のはず"
    assert set(submission["item_id"]) == set(test["item_id"])
    assert submission["price"].isna().sum() == 0
    assert (submission["price"] < 0).sum() == 0
    assert submission["price"].mean() == pytest.approx(9197.631, abs=1.0), (
        "平均が大きくずれる場合、3段の退避チェーンの優先順位("
        "category×condition -> category -> 全体)が違っている可能性が高い"
    )


# run_capstone: 同じ引数なら毎回同じ結果になる(再現性)
def test_run_capstone_deterministic():
    train, test = ex.load_data(data_dir=DATA_DIR)
    sub1 = ex.run_capstone(train, test, valid_frac=0.2, random_state=0)
    sub2 = ex.run_capstone(train, test, valid_frac=0.2, random_state=0)
    pd.testing.assert_frame_equal(sub1.reset_index(drop=True), sub2.reset_index(drop=True))
