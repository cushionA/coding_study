from pathlib import Path

from conftest import load_exercise
import numpy as np
import pandas as pd
import pytest

ex = load_exercise("ex03_holdout_score")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


# split_holdout: 行数の内訳が valid_frac 通りで、重複・欠落がない
def test_split_holdout_shapes_and_no_overlap():
    df = pd.DataFrame({"x": range(20)})
    train_part, valid_part = ex.split_holdout(df, valid_frac=0.2, random_state=0)

    assert len(valid_part) == 4, "20行のvalid_frac=0.2なので検証側は4行のはず"
    assert len(train_part) == 16, "残り16行が学習側"
    assert len(set(train_part.index) & set(valid_part.index)) == 0, "学習側と検証側は行が重複してはいけない"
    assert len(set(train_part.index) | set(valid_part.index)) == 20, "全行が学習側か検証側のどちらかに入っているはず"


# split_holdout: 同じ random_state なら毎回同じ分割になる(決定的)
def test_split_holdout_deterministic():
    df = pd.DataFrame({"x": range(30)})
    tr1, va1 = ex.split_holdout(df, valid_frac=0.3, random_state=42)
    tr2, va2 = ex.split_holdout(df, valid_frac=0.3, random_state=42)
    assert list(tr1.index) == list(tr2.index)
    assert list(va1.index) == list(va2.index)


# category_median_baseline_score: 既知カテゴリの中央値が正しく引かれ、rmsleが期待値と一致する
def test_category_median_baseline_score_known_categories():
    train_part = pd.DataFrame({"category": ["A", "A", "A", "B", "B"], "price": [10, 20, 30, 100, 200]})
    valid_part = pd.DataFrame({"category": ["A", "B"], "price": [15.0, 150.0]})

    result = ex.category_median_baseline_score(train_part, valid_part)

    assert result["n_unseen_category"] == 0, "AもBもtrain_partに存在するカテゴリなので退避は発生しない"
    # A: 中央値20 vs 実際15 / B: 中央値150 vs 実際150(完全一致)
    expected = float(np.sqrt(np.mean((np.log1p([20.0, 150.0]) - np.log1p([15.0, 150.0])) ** 2)))
    assert result["rmsle"] == pytest.approx(expected)


# category_median_baseline_score: 検証側にしか無いカテゴリは train_part 全体の中央値に退避する
def test_category_median_baseline_score_unseen_category_fallback():
    train_part = pd.DataFrame({"category": ["A", "A", "A", "B", "B"], "price": [10, 20, 30, 100, 200]})
    valid_part = pd.DataFrame({"category": ["A", "B", "C"], "price": [15.0, 150.0, 5000.0]})

    result = ex.category_median_baseline_score(train_part, valid_part)

    assert result["n_unseen_category"] == 1, "Cはtrain_partに無いカテゴリなので1件退避が発生する"
    assert result["rmsle"] == pytest.approx(2.9391021401257036), (
        "Cの予測値はtrain_part全体の中央値(30)になっているはず。カテゴリ別の値のままだと数値が変わる"
    )


# category_median_baseline_score: 実データでも例外なく動き、rmsleが有限の正の値になる
def test_category_median_baseline_score_real_data_smoke():
    train = pd.read_csv(DATA_DIR / "train.csv")
    train_part, valid_part = ex.split_holdout(train, valid_frac=0.2, random_state=0)

    result = ex.category_median_baseline_score(train_part, valid_part)

    assert np.isfinite(result["rmsle"])
    assert result["rmsle"] > 0
    assert result["n_unseen_category"] == 0, "categoryはtrainに5種類とも含まれるため、ランダム分割では退避は起きないはず"
