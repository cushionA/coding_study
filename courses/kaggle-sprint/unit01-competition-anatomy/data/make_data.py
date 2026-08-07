"""unit01 の合成コンペデータを生成する(seed固定・再実行で同一結果)。

題材: 中古品マーケットプレイスの出品データから価格を当てる回帰コンペ。

このデータには、Day1 で扱う「モデルの前にまず入力を疑う」ための罠を意図的に仕込んである:
  1. price に 0円 と 桁違いの外れ値 が混ざっている
  2. brand の欠損が特定カテゴリに偏っている(MCARではない)
  3. test にしか出てこない category 値がある
  4. 完全重複行が存在する
  5. price は裾の重い分布(対数正規)
  6. views に負値の異常値が混ざっている(収集側のバグ想定)

実行: python courses/kaggle-sprint/unit01-competition-anatomy/data/make_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260807
OUT = Path(__file__).resolve().parent

CATEGORIES = ["家電", "ファッション", "ホビー", "スポーツ", "本・音楽"]
TEST_ONLY_CATEGORY = "ベビー・キッズ"  # 罠3: train に存在しない
BRANDS = [f"brand_{i:02d}" for i in range(20)]
CONDITIONS = ["新品", "ほぼ新品", "傷や汚れあり", "全体的に状態が悪い"]

# カテゴリごとの価格水準(対数スケールの底上げ)
CATEGORY_BASE = {
    "家電": 9.6,
    "ファッション": 8.2,
    "ホビー": 8.6,
    "スポーツ": 8.8,
    "本・音楽": 7.2,
    TEST_ONLY_CATEGORY: 8.0,
}
CONDITION_ADJ = {"新品": 0.45, "ほぼ新品": 0.20, "傷や汚れあり": -0.15, "全体的に状態が悪い": -0.45}


def _build(rng, n, categories, start_day):
    cat = rng.choice(categories, size=n, p=_cat_probs(categories))
    cond = rng.choice(CONDITIONS, size=n, p=[0.15, 0.35, 0.35, 0.15])
    brand = rng.choice(BRANDS, size=n)
    shipping = rng.choice([0, 1], size=n, p=[0.4, 0.6])  # 1 = 送料込み
    description_len = rng.integers(20, 600, size=n)
    listed_at = pd.to_datetime("2026-01-01") + pd.to_timedelta(
        rng.integers(start_day, start_day + 120, size=n), unit="D"
    )

    # 価格: 対数正規。カテゴリ水準 + 状態 + 送料込み + 説明文の長さ(丁寧な出品ほど高い)が効く
    log_price = (
        np.array([CATEGORY_BASE[c] for c in cat])
        + np.array([CONDITION_ADJ[c] for c in cond])
        + 0.12 * shipping
        + 0.0006 * description_len
        + rng.normal(0, 0.42, size=n)
    )
    price = np.exp(log_price).round(0)

    # views: 価格が安いほど見られやすい + ノイズ
    views = (rng.gamma(2.0, 60.0, size=n) * np.exp(-0.00002 * price)).round(0)

    df = pd.DataFrame(
        {
            "category": cat,
            "brand": brand,
            "condition": cond,
            "shipping": shipping,
            "listed_at": listed_at,
            "description_len": description_len,
            "views": views.astype(int),
            "price": price.astype(int),
        }
    )
    return df


def _cat_probs(categories):
    if TEST_ONLY_CATEGORY in categories:
        return [0.22, 0.26, 0.18, 0.16, 0.14, 0.04]
    return [0.23, 0.27, 0.19, 0.17, 0.14]


def _inject_traps(df, rng, is_train):
    n = len(df)

    # 罠2: brand の欠損が「本・音楽」に偏る(そもそもブランドの概念が薄いカテゴリ)
    miss = rng.random(n) < np.where(df["category"] == "本・音楽", 0.45, 0.06)
    df.loc[miss, "brand"] = np.nan

    # description_len も一定率で欠損させる(こちらはランダム)
    df.loc[rng.random(n) < 0.04, "description_len"] = np.nan

    # 罠6: views に収集バグ由来の負値
    bad = rng.random(n) < 0.012
    df.loc[bad, "views"] = -1

    if is_train:
        # 罠1: price に 0円 と 桁違い(誤入力想定: 100倍)
        zero = rng.random(n) < 0.008
        df.loc[zero, "price"] = 0
        huge = rng.random(n) < 0.005
        df.loc[huge, "price"] = df.loc[huge, "price"] * 100

    return df


def main():
    rng = np.random.default_rng(SEED)

    train = _build(rng, 3000, CATEGORIES, start_day=0)
    test = _build(rng, 1000, CATEGORIES + [TEST_ONLY_CATEGORY], start_day=120)

    train = _inject_traps(train, rng, is_train=True)
    test = _inject_traps(test, rng, is_train=False)

    # 罠4: 完全重複行(同じ出品が二重に収集された想定)。train のみ。
    dup_idx = rng.choice(len(train), size=40, replace=False)
    train = pd.concat([train, train.iloc[dup_idx]], ignore_index=True)
    train = train.sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    train.insert(0, "item_id", [f"tr_{i:05d}" for i in range(len(train))])
    test.insert(0, "item_id", [f"te_{i:05d}" for i in range(len(test))])

    answer = test[["item_id", "price"]].copy()
    test = test.drop(columns=["price"])  # test に目的変数は無い

    sample_submission = pd.DataFrame(
        {"item_id": test["item_id"], "price": float(train["price"].median())}
    )

    train.to_csv(OUT / "train.csv", index=False)
    test.to_csv(OUT / "test.csv", index=False)
    sample_submission.to_csv(OUT / "sample_submission.csv", index=False)

    # test の正解価格 = 「private LB」。学習者からは見えない .solutions/ 側に置く。
    # lesson の最後に、提出ファイルのスコアを答え合わせとして出すためだけに使う。
    answer_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    answer_dir.mkdir(parents=True, exist_ok=True)
    answer.to_csv(answer_dir / "_answer.csv", index=False)
    print("answer ->", answer_dir / "_answer.csv")

    print("train", train.shape, "test", test.shape)
    print(train.dtypes.to_string())
    print("price==0:", int((train["price"] == 0).sum()))
    print("price>1e6:", int((train["price"] > 1_000_000).sum()))
    print("brand欠損率(全体):", round(train["brand"].isna().mean(), 3))
    print("brand欠損率(本・音楽):", round(train.loc[train["category"] == "本・音楽", "brand"].isna().mean(), 3))
    print("完全重複行:", int(train.drop(columns=["item_id"]).duplicated().sum()))
    print("test限定カテゴリ:", sorted(set(test["category"]) - set(train["category"])))
    print("views<0:", int((train["views"] < 0).sum()))


if __name__ == "__main__":
    main()
