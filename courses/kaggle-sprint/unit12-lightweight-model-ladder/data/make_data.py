"""unit12 段5(NER)・段6(小型生成モデル)用のデータを生成する(seed固定)。

題材: 収集した商品タイトルから **ブランド名と型番と色** を抽出する。
      同じタスクを2つのやり方で解いて、精度とコストの「形」を比べるための土台。

        段5 系列ラベリング(NER)     : 1文字ずつ BIO タグを当てる。出力長 = 入力長で固定
        段6 小型生成モデル(seq2seq) : "ブランド|型番|色" を生成する。出力長ぶん推論が要る

【なぜ unit06 のデータを使わないか】
unit06 の `records.csv` には `model_code` 列が無く、型番の正解を復元できない。
かといって unit06 に列を足すと、その lesson のチェックポイントが壊れる。
そこで unit12 に専用データを持たせる。汚れ方は unit06 と同じ設計を踏襲してある。

【タイトルの汚れ(unit06 と同じ性質)】
  - 語順の入れ替え(ブランド・型番・色・カテゴリがランダムな順で並ぶ)
  - 全角英数字化(A340-57 → Ａ３４０－５７)
  - 型番のハイフン落ち(A340-57 → A34057)
  - 販促の接頭辞(【即日発送】◆正規品◆ など)
  - 軽微なタイプミス(1文字の脱落・入れ替え)
  - 空白の脱落(単語がくっつく)
  - ブランド欠損(15%)

【★規則が原理的に負ける条件(test 側にだけ入れてある)】
  実務の実態は「書式1に正規表現を書く → 書式2が現れて継ぎ足す → 書式3が現れる」。
  そこで **train には書式を2種類、test には3種類目** を置く。
  規則は書いた書式にしか当たらないが、学習モデルは見たことのある近縁から
  未知の書式に手が届くかもしれない ---- そこを測るための条件。

  - 型番書式: train は A123-45 と AB-1234 の2種類。**1234-XY は test にしか出ない**。
  - ブランド: 新ブランド3つは train にも入れる(増えること自体は学習できる)。
    **セイランド / ミナヅキ の2つは test 専用**で、完全に未知の場合も見る。

  注: 書式を1種類しか train に入れないと、規則も学習モデルも等しく0点になり
  比較にならない(初版がその失敗をした)。

【この汚れが効く理由】
「正規表現で型番を拾えばいい」で済むなら学習は要らない。実際 unit06 のタイトルでは
素朴な正規表現が 88.9% に当たる。そこで **タイプミスと全角化と空白脱落** を入れて、
規則だけでは届かない残りが出るようにしてある。段5・段6 はその残りを拾えるかで評価する。

【列】
  title         : 収集したままの商品タイトル(汚れあり)
  brand         : 正解のブランド名(空文字 = ブランドの記載が無い)
  model_code    : 正解の型番(汚れる前の正規形)
  color         : 正解の色
  bio           : title の1文字ごとの BIO タグを空白区切りにしたもの
                  O / B-BRAND / I-BRAND / B-MODEL / I-MODEL / B-COLOR / I-COLOR
  target        : 段6 用の生成ターゲット "ブランド|型番|色"(無い項目は空)

実行: python courses/kaggle-sprint/unit12-lightweight-model-ladder/data/make_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260813
OUT = Path(__file__).resolve().parent

# ★ブランドを train 用と test 用に分ける。
#   スクレイピングでは新しいブランドが絶えず現れるので、辞書は原理的に追随できない。
#   test にしか出ないブランドを置くことで「規則が負ける条件」を再現する。
BRANDS_TRAIN = ["アカネ電機", "ソライロ", "ミドリワークス", "KURO", "ハヤブサ",
                "ノースピーク", "TSUBAKI", "オオゾラ", "ゲンブ", "シラユキ"]
# 新ブランドのうち3つは train にも入れる(新ブランドが増えること自体は学習できる)。
# 残り2つは test 専用にして、完全に未知のブランドがどうなるかも見る。
BRANDS_LATER = ["ヤマブキ堂", "コハクワークス", "AOI"]
BRANDS_TEST_ONLY = ["セイランド", "ミナヅキ"]
CATEGORIES = ["掃除機", "腕時計", "ノートパソコン", "スニーカー", "デイパック",
              "冷蔵庫", "イヤホン", "洗濯機"]
COLORS = ["ブラック", "ホワイト", "シルバー", "ネイビー", "レッド", "グリーン"]
PROMO = ["【即日発送】", "◆正規品◆", "【送料無料】", "★新品未使用★", "《アウトレット》"]

ASCII_TO_FULL = str.maketrans(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-",
    "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ－")


# ★型番の書式も複数持たせ、一部を test 専用にする。
#   1本の正規表現で全メーカーの型番を拾うことはできない、という実務の制約を再現する。
def make_model_code(rng, allow_new_formats):
    # train には書式0と書式1の2種類を入れ、書式2は test にしか出さない。
    # 実務の実態が「書式1に正規表現を書く → 書式2が現れて継ぎ足す → 書式3が現れる」
    # だからで、学習モデルが「見たことのある近縁から未知に手が届くか」を測れる条件にする。
    # (書式を1種類しか train に入れないと、規則も学習モデルも等しく0点になり比較にならない)
    f = int(rng.integers(0, 3)) if allow_new_formats else int(rng.integers(0, 2))
    if f == 0:   # train にもある基本形 A123-45
        return f"{chr(65+int(rng.integers(0,26)))}{int(rng.integers(100,999))}-{int(rng.integers(10,99))}"
    if f == 1:   # train にもある AB-1234
        return f"{chr(65+int(rng.integers(0,26)))}{chr(65+int(rng.integers(0,26)))}-{int(rng.integers(1000,9999))}"
    return f"{int(rng.integers(1000,9999))}-{chr(65+int(rng.integers(0,26)))}{chr(65+int(rng.integers(0,26)))}"  # test専用 1234-XY


def build(rng, is_test):
    pool = BRANDS_TRAIN + BRANDS_LATER + (BRANDS_TEST_ONLY if is_test else [])
    brand = "" if rng.random() < 0.15 else pool[int(rng.integers(0, len(pool)))]
    model = make_model_code(rng, allow_new_formats=is_test)
    color = COLORS[int(rng.integers(0, len(COLORS)))]
    cat = CATEGORIES[int(rng.integers(0, len(CATEGORIES)))]

    # --- 表示形を決める(この時点の綴りが title に入る) ---
    shown_model = model
    if rng.random() < 0.30:
        shown_model = shown_model.replace("-", "")          # ハイフン落ち
    shown_brand, shown_color = brand, color

    parts = [p for p in (shown_brand, shown_model, shown_color, cat) if p]
    rng.shuffle(parts)

    # 全角化は「型番だけ」に掛ける(ブランド・色は日本語なので影響が分かりやすい)
    if rng.random() < 0.22:
        shown_model_full = shown_model.translate(ASCII_TO_FULL)
        parts = [shown_model_full if p == shown_model else p for p in parts]
        shown_model = shown_model_full

    sep = "" if rng.random() < 0.35 else " "               # 空白の脱落
    title = sep.join(parts)
    if rng.random() < 0.25:
        title = PROMO[int(rng.integers(0, len(PROMO)))] + title

    # --- タイプミス。1文字落とすか入れ替える(綴りが正解と食い違う) ---
    typo = rng.random() < 0.12
    if typo and len(title) > 6:
        i = int(rng.integers(1, len(title) - 1))
        title = title[:i] + title[i + 1:] if rng.random() < 0.5 else \
            title[:i] + title[i + 1] + title[i] + title[i + 2:]

    return title, brand, model, color, shown_brand, shown_model, shown_color


def bio_tags(title, spans):
    """spans: [(表示文字列, ラベル)]。title 中に見つかった箇所だけタグを付ける。"""
    tags = ["O"] * len(title)
    for text, label in spans:
        if not text:
            continue
        pos = title.find(text)
        if pos < 0:                      # タイプミス等で崩れた場合は付けられない(= 学習の難所)
            continue
        tags[pos] = f"B-{label}"
        for k in range(pos + 1, pos + len(text)):
            tags[k] = f"I-{label}"
    return tags


def main():
    rng = np.random.default_rng(SEED)
    rows = []
    for i in range(4000):
        # 先頭800件が test。test だけ未知ブランド・未知の型番書式が混ざる
        title, brand, model, color, sb, sm, sc = build(rng, is_test=(i < 800))
        tags = bio_tags(title, [(sb, "BRAND"), (sm, "MODEL"), (sc, "COLOR")])
        rows.append({
            "record_id": f"T{i:05d}",
            "title": title,
            "brand": brand,
            "model_code": model,
            "color": color,
            "bio": " ".join(tags),
            "target": f"{brand}|{model}|{color}",
        })
    df = pd.DataFrame(rows)
    test = df.iloc[:800].reset_index(drop=True)
    train = df.iloc[800:].reset_index(drop=True)

    train.to_csv(OUT / "ner_train.csv", index=False)
    test.drop(columns=["brand", "model_code", "color", "bio", "target"]).to_csv(
        OUT / "ner_test.csv", index=False)
    ans = OUT.parents[1] / ".solutions" / OUT.parent.name
    ans.mkdir(parents=True, exist_ok=True)
    test[["record_id", "brand", "model_code", "color", "bio", "target"]].to_csv(
        ans / "_answer.csv", index=False)

    # --- 仕込みの確認 ---
    n = len(train)
    print("train", train.shape, "test", test.shape)
    print("ブランド欠損:", f"{(train['brand']=='').mean():.1%}")
    tagged = train["bio"].str.contains("B-MODEL").mean()
    print("型番にタグを付けられた行:", f"{tagged:.1%}  ← 残りはタイプミス等で綴りが崩れた行")
    print("ブランドにタグを付けられた行:",
          f"{train.loc[train['brand']!='','bio'].str.contains('B-BRAND').mean():.1%}")
    import re
    pat = re.compile(r"[A-Za-zＡ-Ｚａ-ｚ][0-9０-９]{2,3}[-－]?[0-9０-９]{2}")
    naive = train["title"].map(lambda t: bool(pat.search(t))).mean()
    print("素朴な正規表現で型番が見つかる行:", f"{naive:.1%}  ← 段5/段6はこれを超えられるかで評価する")
    print("\n例:")
    for _, r in train.head(5).iterrows():
        print(f"  {r['title']}")
        print(f"    → brand={r['brand'] or '(なし)'} model={r['model_code']} color={r['color']}")


if __name__ == "__main__":
    main()
