"""unit02 の合成データを生成する(seed固定・再実行で同一結果)。

題材: 複数のECサイトから収集した商品リストから、実売価格 `price` を当てる回帰コンペ。

このユニットの主題は「信じられる CV を作る」こと。そのため、素朴な KFold が
**不当に良いスコアを出す**構造を意図的に3つ仕込んである。

  【リーク1: グループリーク】
    同一商品(`product_key`)が複数サイトから重複収集されており、1商品あたり1〜4行ある。
    同一商品の price はほぼ同じ。`model_code`(型番)がその商品をほぼ一意に指すため、
    ランダムな KFold では「同じ商品の答えを train 側で見てから test 側を当てる」ことになり、
    スコアが実力より大幅に良く出る。GroupKFold(groups=product_key) で正しくなる。

  【リーク2: 時間リーク】
    `collected_at` は 2025-10-01 〜 2026-03-31。価格は時間とともに下落する(月あたり約6%の相場下落)。
    ランダム分割では「未来を見てから過去を当てる」ため楽になる。
    提出対象の test は最終月なので、TimeSeriesSplit の方が本番に近い。

  【リーク3: ターゲットリーク】
    `discount_rate` は (list_price - price) / list_price として作られた列。
    つまり price から逆算された特徴量であり、list_price と併せると price が完全に復元できる。
    これを入れると CV がほぼ 0 になる。「良すぎるスコアは疑う」ための教材。

実行: python courses/kaggle-sprint/unit02-validation-and-leakage/data/make_data.py

--------------------------------------------------------------------------
実測済みの数値(教材の期待値はこれを正本とする。lightgbm 4.7 / sklearn 1.x)
--------------------------------------------------------------------------

【グループリークの実証】
「同じ型番なら同じ価格だろう」という素朴なベースライン
(model_code ごとの平均 log price を貼り、未知型番は全体平均で埋める):

    検証方法                    RMSLE     検証時の未知型番率
    KFold(5, shuffle=True)      0.6078     20.4%
    GroupKFold(5, product_key)  1.1119    100.0%
    本番LB(未来のtest)          1.1670     96.4%

  → KFold は本番の半分のスコアを報告する。GroupKFold はほぼ的中する。
    理由は「未知型番率」を見れば分かる。本番では96%が未知なのに、
    KFold の検証では80%が既知になってしまっている。

【時間リークの実証】(model_code を使わない特徴量 + LightGBM)

    KFold(5, shuffle=True)      0.6859
    TimeSeriesSplit(5)          0.7145   ← 本番に近い
    本番LB                      0.7060

  注意: TimeSeriesSplit は先頭ブロックをどの検証にも含めない(この設定では
  1661行中1380行しか検証されない)。OOF配列を0で初期化したまま全行で採点すると
  デタラメな値になる。教材ではこの落とし穴も扱うこと。

【ターゲットリークの実証】(GroupKFold で固定して比較)

    リーク列(list_price, discount_rate)あり   0.0681   ← 良すぎる
    リーク列なし                               0.7138

  → price = list_price * (1 - discount_rate) で完全復元できる。
    「スコアが良すぎるときは喜ぶ前に疑う」ための教材。
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260802
OUT = Path(__file__).resolve().parent

SITES = ["site_A", "site_B", "site_C", "site_D"]
SITE_MULT = {"site_A": 1.00, "site_B": 1.06, "site_C": 0.94, "site_D": 1.02}
CATEGORIES = ["家電", "ファッション", "ホビー", "スポーツ", "本・音楽"]
CATEGORY_BASE = {"家電": 10.2, "ファッション": 8.5, "ホビー": 8.9, "スポーツ": 9.1, "本・音楽": 7.4}
CONDITIONS = ["新品", "ほぼ新品", "傷や汚れあり", "全体的に状態が悪い"]
CONDITION_ADJ = {"新品": 0.40, "ほぼ新品": 0.18, "傷や汚れあり": -0.16, "全体的に状態が悪い": -0.44}

N_PRODUCTS = 900
START = pd.Timestamp("2025-10-01")
END = pd.Timestamp("2026-03-31")
TEST_FROM = pd.Timestamp("2026-03-01")  # 最終月を test にする(本番 = 未来を当てる)


def main():
    rng = np.random.default_rng(SEED)

    # --- 商品マスタ: 1商品が「真の価値」を1つ持つ ---
    cat = rng.choice(CATEGORIES, size=N_PRODUCTS, p=[0.22, 0.27, 0.19, 0.18, 0.14])
    brand_tier = rng.choice([0, 1, 2], size=N_PRODUCTS, p=[0.5, 0.35, 0.15])
    base_log = (
        np.array([CATEGORY_BASE[c] for c in cat])
        + 0.35 * brand_tier
        + rng.normal(0, 0.62, size=N_PRODUCTS)
    )
    products = pd.DataFrame(
        {
            "product_key": [f"P{i:05d}" for i in range(N_PRODUCTS)],
            "model_code": [f"MC-{rng.integers(1000, 9999)}-{i:04d}" for i in range(N_PRODUCTS)],
            "category": cat,
            "brand_tier": brand_tier,
            "base_log": base_log,
        }
    )

    # --- 収集レコード: 1商品が 1〜4 サイトに出現する(= グループ構造) ---
    n_rec = rng.choice([1, 2, 3, 4], size=N_PRODUCTS, p=[0.30, 0.34, 0.24, 0.12])
    rows = []
    for prod, k in zip(products.itertuples(index=False), n_rec):
        for site in rng.choice(SITES, size=k, replace=False):
            rows.append((prod.product_key, prod.model_code, prod.category,
                         prod.brand_tier, prod.base_log, site))
    df = pd.DataFrame(rows, columns=["product_key", "model_code", "category",
                                     "brand_tier", "base_log", "site"])
    n = len(df)

    # --- 収集日時: 商品ごとに近い時期にまとまって収集される ---
    span_days = (END - START).days
    prod_day = dict(zip(products["product_key"],
                        rng.integers(0, span_days - 5, size=N_PRODUCTS)))
    day = np.array([prod_day[k] for k in df["product_key"]]) + rng.integers(0, 6, size=n)
    df["collected_at"] = START + pd.to_timedelta(np.clip(day, 0, span_days), unit="D")

    df["condition"] = rng.choice(CONDITIONS, size=n, p=[0.18, 0.34, 0.34, 0.14])
    df["views"] = rng.gamma(2.0, 55.0, size=n).round(0).astype(int)
    df["title_len"] = rng.integers(15, 120, size=n)

    # --- 価格 ---
    # 時間とともに相場が下落する(月あたり -6%)。ランダム分割だとこの傾きを「未来から学べる」。
    months = (df["collected_at"] - START).dt.days / 30.0
    log_price = (
        df["base_log"].to_numpy()
        + np.array([CONDITION_ADJ[c] for c in df["condition"]])
        + np.log(np.array([SITE_MULT[s] for s in df["site"]]))
        - 0.060 * months.to_numpy()
        + rng.normal(0, 0.06, size=n)  # 同一商品でもサイト間で少しブレる(が、ほぼ同じ)
    )
    df["price"] = np.exp(log_price).round(0).astype(int)

    # --- リーク3: price から逆算された特徴量 ---
    df["list_price"] = (df["price"] * rng.uniform(1.05, 1.9, size=n)).round(0).astype(int)
    df["discount_rate"] = ((df["list_price"] - df["price"]) / df["list_price"]).round(6)

    df = df.drop(columns=["base_log"])
    df = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    df.insert(0, "record_id", [f"R{i:05d}" for i in range(len(df))])

    # --- train / test は時間で分ける(本番 = 未来を当てる) ---
    is_test = df["collected_at"] >= TEST_FROM
    train = df.loc[~is_test].reset_index(drop=True)
    test = df.loc[is_test].reset_index(drop=True)

    answer = test[["record_id", "price"]].copy()
    test = test.drop(columns=["price", "discount_rate"])  # 未来の実売価格は当然わからない

    sample_submission = pd.DataFrame(
        {"record_id": test["record_id"], "price": float(train["price"].median())}
    )

    train.to_csv(OUT / "train.csv", index=False)
    test.to_csv(OUT / "test.csv", index=False)
    sample_submission.to_csv(OUT / "sample_submission.csv", index=False)

    answer_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    answer_dir.mkdir(parents=True, exist_ok=True)
    answer.to_csv(answer_dir / "_answer.csv", index=False)

    # --- 仕込みが効いているかの確認 ---
    print("train", train.shape, "test", test.shape)
    vc = train["product_key"].value_counts()
    print("train の商品数:", train["product_key"].nunique(), "/ 行数:", len(train))
    print("1商品あたり行数の分布:", vc.value_counts().sort_index().to_dict())
    print("2行以上ある商品の割合:", round((vc >= 2).mean(), 3))
    # 同一商品内の price のばらつき(小さいほどグループリークが効く)
    g = train.groupby("product_key")["price"]
    within = (g.std() / g.mean()).dropna()
    print("同一商品内の price 変動係数の中央値:", round(float(within.median()), 4))
    print("discount_rate から price を完全復元できるか:",
          bool(np.allclose(train["list_price"] * (1 - train["discount_rate"]), train["price"], atol=1.0)))
    print("train 期間:", train["collected_at"].min(), "〜", train["collected_at"].max())
    print("test  期間:", test["collected_at"].min(), "〜", test["collected_at"].max())
    print("train と test に共通する product_key:",
          len(set(train["product_key"]) & set(test["product_key"])))
    print("answer ->", answer_dir / "_answer.csv")


if __name__ == "__main__":
    main()
