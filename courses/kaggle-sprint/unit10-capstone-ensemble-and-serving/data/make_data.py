"""unit10(キャップストーン)の合成データを生成する(seed固定・再実行で同一結果)。

題材: Day2〜4 で扱ったのと**同じ中古品マーケットプレイスの価格予測**。
      ただしキャップストーン用に規模を広げ、**非線形な構造**を追加した拡張版。

【なぜ unit02 のデータをそのまま使わないか】
unit02 のデータは対数空間で厳密に線形な生成モデル(カテゴリ + ブランド + 状態 +
サイト + 時間 + ノイズ)である。そのため線形モデルが理論上の最適解にほぼ到達してしまい、
勾配ブースティング木がそれを超える余地がない。実測すると:

    Ridge            OOF 0.6378 / LB 0.6092
    LightGBM         OOF 0.7249 / LB 0.6835
    最適ブレンド重み   Ridge 100% / LightGBM 0%   ← 混ぜる意味が構造的に無い

これでは「複数モデルの OOF をブレンドする」というキャップストーンの主題が成立しない。
そこで unit10 用に、**木が拾えて線形モデルが拾えない構造**を意図的に足したデータを作る。
列構成は unit02 と同一なので、Day2〜4 で書いたコードはほぼそのまま流用できる。

【追加した非線形構造】
  1. カテゴリ × 状態 の交互作用
     「新品」のプレミアムはカテゴリごとに大きく違う(家電では非常に大きく、
     本・音楽ではほぼ無い)。加法モデルでは表現できない。
  2. 閲覧数の閾値効果
     views がある値を超えると「人気商品」として価格が跳ねる(段差)。
     線形モデルは滑らかな傾きしか引けない。
  3. タイトル長の非単調効果
     短すぎる出品は情報不足で安く、長すぎる出品は転売業者の定型文で安い。
     中庸が最も高い(逆U字)。
  4. ブランド帯 × カテゴリ の交互作用
     高級ブランドの効果は家電・ファッションで大きく、本・音楽では小さい。

【グループ構造と時間構造は unit02 と同じ】
  同一商品が複数サイトに出現する(GroupKFold(product_key) が必須)。
  train は 2025-10〜2026-02、test は 2026-03(未来)。価格は月あたり約6%下落。

実行: python courses/kaggle-sprint/unit10-capstone-ensemble-and-serving/data/make_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260810
OUT = Path(__file__).resolve().parent

SITES = ["site_A", "site_B", "site_C", "site_D", "site_E"]
SITE_MULT = {"site_A": 1.00, "site_B": 1.06, "site_C": 0.94, "site_D": 1.02, "site_E": 0.98}
CATEGORIES = ["家電", "ファッション", "ホビー", "スポーツ", "本・音楽"]
CATEGORY_BASE = {"家電": 10.2, "ファッション": 8.5, "ホビー": 8.9, "スポーツ": 9.1, "本・音楽": 7.4}
CONDITIONS = ["新品", "ほぼ新品", "傷や汚れあり", "全体的に状態が悪い"]

# 【非線形1】カテゴリ × 状態 の交互作用。加法モデルでは表現できない。
#   家電は新品プレミアムが極端に大きく、本・音楽はほぼ無い。
CONDITION_BY_CATEGORY = {
    "家電":         {"新品": 0.85, "ほぼ新品": 0.30, "傷や汚れあり": -0.35, "全体的に状態が悪い": -0.95},
    "ファッション": {"新品": 0.45, "ほぼ新品": 0.20, "傷や汚れあり": -0.25, "全体的に状態が悪い": -0.60},
    "ホビー":       {"新品": 0.70, "ほぼ新品": 0.35, "傷や汚れあり": -0.45, "全体的に状態が悪い": -0.80},
    "スポーツ":     {"新品": 0.40, "ほぼ新品": 0.18, "傷や汚れあり": -0.20, "全体的に状態が悪い": -0.50},
    "本・音楽":     {"新品": 0.10, "ほぼ新品": 0.05, "傷や汚れあり": -0.08, "全体的に状態が悪い": -0.15},
}

# 【非線形4】ブランド帯 × カテゴリ の交互作用
BRAND_GAIN_BY_CATEGORY = {"家電": 0.55, "ファッション": 0.50, "ホビー": 0.25,
                          "スポーツ": 0.30, "本・音楽": 0.05}

N_PRODUCTS = 2200
START = pd.Timestamp("2025-10-01")
END = pd.Timestamp("2026-03-31")
TEST_FROM = pd.Timestamp("2026-03-01")

VIEWS_THRESHOLD = 180      # 【非線形2】これを超えると人気商品として価格が跳ねる
VIEWS_JUMP = 0.32
TITLE_OPT = 68             # 【非線形3】タイトル長の最適値(逆U字の頂点)


def main():
    rng = np.random.default_rng(SEED)

    cat = rng.choice(CATEGORIES, size=N_PRODUCTS, p=[0.22, 0.27, 0.19, 0.18, 0.14])
    brand_tier = rng.choice([0, 1, 2], size=N_PRODUCTS, p=[0.5, 0.35, 0.15])
    base_log = (
        np.array([CATEGORY_BASE[c] for c in cat])
        + np.array([BRAND_GAIN_BY_CATEGORY[c] for c in cat]) * brand_tier   # 交互作用
        + rng.normal(0, 0.55, size=N_PRODUCTS)
    )
    products = pd.DataFrame({
        "product_key": [f"P{i:05d}" for i in range(N_PRODUCTS)],
        "model_code": [f"MC-{rng.integers(1000, 9999)}-{i:04d}" for i in range(N_PRODUCTS)],
        "category": cat,
        "brand_tier": brand_tier,
        "base_log": base_log,
    })

    n_rec = rng.choice([1, 2, 3, 4], size=N_PRODUCTS, p=[0.28, 0.34, 0.24, 0.14])
    rows = []
    for p, k in zip(products.itertuples(index=False), n_rec):
        for site in rng.choice(SITES, size=k, replace=False):
            rows.append((p.product_key, p.model_code, p.category, p.brand_tier, p.base_log, site))
    df = pd.DataFrame(rows, columns=["product_key", "model_code", "category",
                                     "brand_tier", "base_log", "site"])
    n = len(df)

    span = (END - START).days
    prod_day = dict(zip(products["product_key"], rng.integers(0, span - 5, size=N_PRODUCTS)))
    day = np.array([prod_day[k] for k in df["product_key"]]) + rng.integers(0, 6, size=n)
    df["collected_at"] = START + pd.to_timedelta(np.clip(day, 0, span), unit="D")

    df["condition"] = rng.choice(CONDITIONS, size=n, p=[0.18, 0.34, 0.34, 0.14])
    df["views"] = rng.gamma(2.2, 70.0, size=n).round(0).astype(int)
    df["title_len"] = rng.integers(15, 130, size=n)

    months = (df["collected_at"] - START).dt.days / 30.0
    cond_effect = np.array([CONDITION_BY_CATEGORY[c][k]
                            for c, k in zip(df["category"], df["condition"])])
    views_jump = np.where(df["views"].to_numpy() > VIEWS_THRESHOLD, VIEWS_JUMP, 0.0)
    title_effect = -0.000045 * (df["title_len"].to_numpy() - TITLE_OPT) ** 2   # 逆U字

    log_price = (
        df["base_log"].to_numpy()
        + cond_effect
        + views_jump
        + title_effect
        + np.log(np.array([SITE_MULT[s] for s in df["site"]]))
        - 0.060 * months.to_numpy()
        + rng.normal(0, 0.16, size=n)
    )
    df["price"] = np.exp(log_price).round(0).astype(int)
    df = df.drop(columns=["base_log"]).sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    df.insert(0, "record_id", [f"R{i:05d}" for i in range(len(df))])

    is_test = df["collected_at"] >= TEST_FROM
    train = df.loc[~is_test].reset_index(drop=True)
    test = df.loc[is_test].reset_index(drop=True)

    answer = test[["record_id", "price"]].copy()
    test = test.drop(columns=["price"])
    sample_submission = pd.DataFrame(
        {"record_id": test["record_id"], "price": float(train["price"].median())})

    train.to_csv(OUT / "train.csv", index=False)
    test.to_csv(OUT / "test.csv", index=False)
    sample_submission.to_csv(OUT / "sample_submission.csv", index=False)
    ans_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    ans_dir.mkdir(parents=True, exist_ok=True)
    answer.to_csv(ans_dir / "_answer.csv", index=False)

    print("train", train.shape, "test", test.shape)
    print("商品数:", train["product_key"].nunique(), "/ 1商品あたり:",
          train["product_key"].value_counts().value_counts().sort_index().to_dict())
    print("views が閾値超え:", int((train["views"] > VIEWS_THRESHOLD).mean() * 100), "%")
    print("train 期間:", train["collected_at"].min().date(), "〜", train["collected_at"].max().date())
    print("test  期間:", test["collected_at"].min().date(), "〜", test["collected_at"].max().date())
    print("answer ->", ans_dir / "_answer.csv")


if __name__ == "__main__":
    main()
