"""unit06 の合成データを生成する(seed固定・再実行で同一結果)。

題材: 複数の出所から集めた商品レコードのうち、どれとどれが「同じ商品」かを判定する
      名寄せ(エンティティ解決)。ペアを作って二値分類する形に定式化する。

このユニットの核心は **古典 → 深層の橋渡しが1つの課題の中で完結する** こと。
そのため、表記ゆれを3つの層に分けて仕込んである。

  【層1: 文字列類似度で捕まる揺れ】
    全角/半角、記号の有無、型番のハイフン位置、語順の入れ替え、余分な販促語、
    軽微なタイプミス。編集距離・Jaccard・共通接頭辞で十分に捕まる。

  【層2: TF-IDFコサインで捕まる揺れ】
    語の一部が入れ替わるが、特徴的な語(ブランド名・型番)は共有している。
    文字の並びは大きく違うので編集距離では捕まりにくいが、語の重なりでは捕まる。

  【層3: 文字列では捕まらない揺れ ← 埋め込みが必要になる動機】
    同義語で完全に言い換えられている(「ワイヤレスイヤホン」↔「Bluetoothヘッドホン」、
    「冷蔵庫」↔「レフリジレーター」など)。共通の文字がほとんど無いため、
    編集距離も TF-IDF も無力。意味を捉える埋め込みが必要になる。

  【難しい負例(hard negatives)】
    同一ブランド・同一カテゴリだが別商品(型番だけが違う)のペアを大量に含む。
    これがないと「ブランドが同じなら同一」という雑な規則で解けてしまう。

  【不均衡】
    全ペアのうち正例(同一商品)はごく少数。blocking の必要性と、
    precision/recall のトレードオフを扱う動機になる。

【オフライン制約】
埋め込みは事前学習済み重みを使わない。`vocab.csv` に語彙と「意味グループID」を持たせ、
演習側では seed 固定で「意味グループごとに中心ベクトル + ノイズ」という構造の
疑似埋め込み行列を生成して使う。同義語は同じ意味グループに属するので、
埋め込みの平均(mean pooling)を取ると層3のペアが近くなる。

実行: python courses/kaggle-sprint/unit06-entity-resolution/data/make_data.py

--------------------------------------------------------------------------
実測済みの数値(教材の期待値はこれを正本とする)
--------------------------------------------------------------------------

【データの規模】
  レコード 1340行 / 商品 600件 / 1商品あたり 1〜4レコード
  全ペア 897,130 のうち正例(同一商品)は 1,136 件 = **正例率 0.127%**
  → 総当たりは現実的でなく、かつ極端な不均衡になることが blocking の動機。

【blocking の効果(先頭2文字 / ブランド / 価格帯 の和集合、巨大バケツは捨てる)】
  897,130ペア → 130,584ペア(14.6%)に削減、正例の再現率 88.7%
  → **計算量を1/7に減らす代わりに正例を11%取りこぼす**。このトレードオフが要点。

【手法ごとの分離性能(正例と負例のスコア中央値の差。大きいほど分離できる)】
    手法              正例    負例     差
    正規化編集距離    0.294   0.100   0.194
    Jaccard(2-gram)  0.484   0.097   0.388
    TF-IDFコサイン    0.494   0.072   0.422
    埋め込みコサイン  0.863   0.276   0.587

【★教材の核心: 正例を「揺れの層」で分けたときの各手法の中央値】
    層   正規化編集距離  Jaccard  TF-IDFコサイン  埋め込みコサイン
    1        0.348      0.667      0.597          1.000
    2        0.300      0.455      0.495          0.754
    3        0.238      0.306      0.265          0.955

  → 層3(同義語で完全に言い換えられたペア)では、文字列系3手法がそろって崩れる
    (Jaccard 0.667→0.306、TF-IDF 0.597→0.265)のに、**埋め込みだけが 0.955 を保つ**。
    「文字列類似度では捕まらないものがある」ことが数字で示せる。
    これが古典 → 深層へ渡る動機そのものになる。

  注: 層2の埋め込みコサイン(0.754)が層3(0.955)より低いのは、層2では色名など
  「意味グループの違う語」が片方だけに混ざることがあり、mean pooling で薄まるため。
  mean pooling の弱点(余計な語に引きずられる)を説明する good example になる。
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260806
OUT = Path(__file__).resolve().parent

SOURCES = ["site_A", "site_B", "site_C", "site_D", "site_E"]

# (正式名, 同義語リスト, 意味グループID) — 同義語は層3の言い換えに使う
PRODUCT_WORDS = [
    ("ワイヤレスイヤホン", ["Bluetoothヘッドホン", "無線イヤフォン"], 0),
    ("冷蔵庫", ["レフリジレーター", "冷凍冷蔵庫"], 1),
    ("洗濯機", ["ウォッシャー", "全自動洗濯機"], 2),
    ("掃除機", ["クリーナー", "バキュームクリーナー"], 3),
    ("液晶テレビ", ["LEDテレビ", "薄型TV"], 4),
    ("ノートパソコン", ["ラップトップ", "ノートPC"], 5),
    ("スニーカー", ["運動靴", "シューズ"], 6),
    ("リュックサック", ["バックパック", "デイパック"], 7),
    ("腕時計", ["ウォッチ", "リストウォッチ"], 8),
    ("電子レンジ", ["オーブンレンジ", "マイクロウェーブ"], 9),
    ("空気清浄機", ["エアクリーナー", "エアピュリファイア"], 10),
    ("炊飯器", ["ライスクッカー", "電気炊飯ジャー"], 11),
]
BRANDS = ["アカネ電機", "ソライロ", "ミドリワークス", "KURO", "ハヤブサ",
          "ノースピーク", "TSUBAKI", "オオゾラ", "ゲンブ", "シラユキ"]
COLORS = ["ブラック", "ホワイト", "シルバー", "ネイビー", "レッド"]
PROMO = ["【送料無料】", "★新品未使用★", "【即日発送】", "◆正規品◆", "《アウトレット》"]

ASCII_TO_FULL = str.maketrans(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-",
    "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ－",
)


def _typo(rng, s):
    """1文字だけ落とす / 入れ替える(軽微なタイプミス)"""
    if len(s) < 4:
        return s
    i = int(rng.integers(1, len(s) - 1))
    if rng.random() < 0.5:
        return s[:i] + s[i + 1:]
    return s[:i] + s[i + 1] + s[i] + s[i + 2:]


def _variant(rng, product, layer):
    """1商品から1レコード分のタイトルを作る。layer で揺れの種類を変える。"""
    name, synonyms, _ = product["words"]
    brand, code, color = product["brand"], product["code"], product["color"]

    if layer == 3:
        # 層3: 同義語で完全に言い換える。型番も落とすことがある。
        noun = rng.choice(synonyms)
        parts = [brand, noun, color]
        if rng.random() < 0.35:
            parts.append(code)
    elif layer == 2:
        # 層2: 語の一部が入れ替わるが型番/ブランドは残る
        noun = name if rng.random() < 0.6 else rng.choice(synonyms)
        parts = [brand, noun, code]
        if rng.random() < 0.5:
            parts.append(rng.choice(COLORS))  # 色が食い違うことがある
    else:
        # 層1: 表層的な揺れのみ
        parts = [brand, name, code, color]

    rng.shuffle(parts)  # 語順の入れ替え
    title = " ".join(parts)

    if rng.random() < 0.30:
        title = title.replace("-", "")             # 型番のハイフンを落とす
    if rng.random() < 0.20:
        title = title.translate(ASCII_TO_FULL)     # 全角化
    if rng.random() < 0.25:
        title = rng.choice(PROMO) + title          # 販促語
    if rng.random() < 0.15:
        title = _typo(rng, title)                  # タイプミス
    if rng.random() < 0.20:
        title = title.replace(" ", "")             # 空白を落とす
    return title


def main():
    rng = np.random.default_rng(SEED)
    n_products = 600

    # --- 商品マスタ ---
    products = []
    for i in range(n_products):
        w = PRODUCT_WORDS[int(rng.integers(0, len(PRODUCT_WORDS)))]
        products.append({
            "product_key": f"P{i:04d}",
            "words": w,
            "brand": BRANDS[int(rng.integers(0, len(BRANDS)))],
            "code": f"{chr(65 + int(rng.integers(0, 26)))}{int(rng.integers(100, 999))}-{int(rng.integers(10, 99))}",
            "color": COLORS[int(rng.integers(0, len(COLORS)))],
            "base_price": int(np.exp(rng.normal(9.4, 0.7))),
            "sense_group": w[2],
        })

    # --- 収集レコード: 1商品が 1〜4 出所に現れる ---
    rows = []
    rid = 0
    for p in products:
        k = int(rng.choice([1, 2, 3, 4], p=[0.28, 0.34, 0.24, 0.14]))
        # 層の割り当て: 層1が多く、層3は少数(だが埋め込みの動機として必須)
        layers = rng.choice([1, 2, 3], size=k, p=[0.55, 0.30, 0.15])
        for site, layer in zip(rng.choice(SOURCES, size=k, replace=False), layers):
            rows.append({
                "record_id": f"R{rid:05d}",
                "source": site,
                "title": _variant(rng, p, int(layer)),
                "brand": p["brand"] if rng.random() < 0.85 else "",   # 15%はブランド欠損
                "price": int(p["base_price"] * rng.uniform(0.88, 1.14)),
                "product_key": p["product_key"],       # ← 正解の名寄せID
                "variation_layer": int(layer),         # ← 教材の分析用
            })
            rid += 1

    df = pd.DataFrame(rows).sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    # --- 語彙表(疑似埋め込みを作るための意味グループ付き) ---
    vocab = []
    for name, syns, gid in PRODUCT_WORDS:
        for w in [name] + syns:
            vocab.append({"token": w, "sense_group": gid})
    for i, b in enumerate(BRANDS):
        vocab.append({"token": b, "sense_group": 100 + i})     # ブランドは各自独立
    for i, c in enumerate(COLORS):
        vocab.append({"token": c, "sense_group": 200 + i})     # 色も各自独立
    vocab_df = pd.DataFrame(vocab)

    df.to_csv(OUT / "records.csv", index=False)
    vocab_df.to_csv(OUT / "vocab.csv", index=False)

    # 正解(名寄せID)は .solutions 側にも置く
    answer_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    answer_dir.mkdir(parents=True, exist_ok=True)
    df[["record_id", "product_key", "variation_layer"]].to_csv(
        answer_dir / "_answer.csv", index=False)

    # --- 仕込みの確認 ---
    print("records", df.shape, "| 商品数:", df["product_key"].nunique())
    vc = df["product_key"].value_counts()
    print("1商品あたりレコード数:", vc.value_counts().sort_index().to_dict())
    n = len(df)
    n_pairs_all = n * (n - 1) // 2
    n_pos = int((vc * (vc - 1) // 2).sum())
    print(f"全ペア数: {n_pairs_all:,}  うち正例(同一商品): {n_pos:,}  正例率: {n_pos/n_pairs_all:.5%}")
    print("揺れの層の分布:", df["variation_layer"].value_counts().sort_index().to_dict())
    print("ブランド欠損:", int((df["brand"] == "").sum()))
    print("語彙数:", len(vocab_df), "| 意味グループ数:", vocab_df["sense_group"].nunique())
    print("\nサンプル(同一商品の複数レコード):")
    key = vc[vc >= 3].index[0]
    for _, r in df[df["product_key"] == key].iterrows():
        print(f"  [層{r['variation_layer']}] {r['source']:7s} {r['title']}")


if __name__ == "__main__":
    main()
