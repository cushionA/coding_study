"""unit11 の合成データを生成する(seed固定・再実行で同一結果)。

題材: 1商品に対する複数レビューをまとめた文書から、要点2〜3文の要約を作る。

  【文書の構造】
    各文書は「その商品について複数の人が書いたレビュー文」を連ねたもの(8〜14文)。
      - 論点文(key point): 2〜3個の論点が、それぞれ **2〜4回言い換えて繰り返される**。
        繰り返されるので類似度グラフ上の中心性が高くなる = 抽出型要約が拾うべき文。
      - 雑音文(filler): 1回しか出てこない個人的な感想・関係ない話。中心性は低い。

  【★MMR が効くことの仕込み】
    論点は複数回言い換えられているので、中心性スコアの上位を素朴に N 件取ると
    **同じ論点の言い換えばかりを選んでしまう**。MMR(既に選んだ文と似すぎる文に
    ペナルティを与える)を入れると、異なる論点に散らばる。
    この差が数字で出るように、論点あたりの言い換え数を意図的に多くしてある。

  【参照要約】
    各論点の「正式な言い方」を1文ずつ並べたもの。文書中の言い換え文とは語彙を
    意図的にずらしてある(「音質が値段のわりに良い」に対して「コストパフォーマンスに
    優れる」)。そのため、
      - 抽出型要約は ROUGE で満点を取れない(語彙が完全一致しない)
      - ROUGE が「言い換えを評価できない」ことの実例になる
    という2つの教材が同時に成立する。

  【ハルシネーション検知の材料】
    論点文には価格・日数・サイズなどの **数値** と、ブランド名などの固有表現が入る。
    生成文中の数値・固有表現が原文に含まれるかを照合してスコア化する演習に使う。
    原文に無い数値を混ぜた「壊れた要約」も `hallucinated_summary` 列として同梱する。

実行: python courses/kaggle-sprint/unit11-summarization/data/make_data.py

--------------------------------------------------------------------------
実測済みの数値(教材の期待値はこれを正本とする)
--------------------------------------------------------------------------

文書300件、平均論点数 2.50。文分割 → TF-IDF(char_wb 2-3gram)→ 文間コサイン
→ 中心性 = 類似度の行和 → 上位k文、で評価:

  手法                      カバー論点  重複選択  ROUGE-2      ROUGE-2
                                                (抽象型参照)  (抽出型参照)
  ① 中心性トップkを素朴に      1.283    1.220    0.0174       0.4906
  ② MMR(λ=0.7)               1.797    0.707    0.0237       0.6011

【この表から2つの教訓が同時に出る】

1) MMR の効果 —— 素朴な中心性は平均 1.22 文も「同じ論点の言い換え」を重複して
   選んでしまう(k=2.5 のうち約半分が無駄)。MMR を入れると重複が 0.707 に半減し、
   カバーできる論点数が 1.283 → 1.797 に増える。ROUGE(抽出型参照)も 0.49 → 0.60。

2) ★ROUGE の盲点 —— **まったく同じ要約文**が、参照要約の書き方だけで
   ROUGE 0.0237 と 0.6011 に分かれる(25倍の差)。
   抽象型参照(「コストパフォーマンスに優れる。」)は文書中の言い換え
   (「音質がこの値段のわりに良いです。」)と語彙が重ならないため、
   抽出が完璧でも ROUGE はほぼ 0 になる。
   **学習者が「自分のコードが壊れている」と誤解しやすい箇所なので、
   lesson で必ず「これは ROUGE の限界であって君のバグではない」と明示すること。**
   n-gram の重なりしか見ない指標は、言い換えを正しく評価できない。

【列】
  document              : 文書本体(8〜17文)
  reference_summary     : 抽象型の参照要約(語彙をずらしてある)
  extractive_reference  : 抽出型の参照要約(文書中に実在する文を1論点1文で並べたもの)
  hallucinated_summary  : 原文に無いブランド名と保証月数を混ぜた壊れた要約
                          (ハルシネーション検知の演習用。数値・固有表現の照合で捕まる)
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260811
OUT = Path(__file__).resolve().parent

BRANDS = ["アカネ電機", "ソライロ", "ミドリワークス", "ハヤブサ", "ノースピーク"]

# (正式な言い方のテンプレ, 言い換えのテンプレ群)。{n} には数値が入る。
KEY_POINTS = [
    # (参照要約に載る正式な言い方, 文書中に現れる言い換え群, 数値の範囲)
    #
    # 言い換えは「同じ論点を似た言葉で繰り返す」形にしてある。実際のレビューでも
    # 同じ論点は似た語彙で書かれる。これによって(a)繰り返しが類似度グラフ上で
    # 互いを押し上げて中心性が高くなり、(b)MMR の冗長ペナルティが発火する。
    # 一方で「正式な言い方」は語彙をずらしてあるので、抽出型要約は ROUGE で
    # 満点を取れない = ROUGE が言い換えを評価できないことの実例になる。
    ("コストパフォーマンスに優れる。",
     ["音質がこの値段のわりに良いです。", "音質が値段のわりに良かったです。",
      "音質は{n}円という値段のわりに良いと思います。",
      "音質がこの値段のわりに良いと感じました。"], (2000, 30000)),
    ("電池の持続時間が長い。",
     ["バッテリーが{n}時間ほど持ちました。", "バッテリーが{n}時間くらい持ちます。",
      "バッテリーの持ちが{n}時間ほどで良いです。",
      "バッテリーは{n}時間前後持ちました。"], (5, 40)),
    ("長時間の使用でも負担が少ない。",
     ["装着感が軽くて疲れません。", "装着感が軽く疲れにくいです。",
      "装着感が軽いので長時間でも疲れません。",
      "装着感が軽くて長時間でも平気でした。"], (1, 2)),
    ("到着までが速い。",
     ["発送が早くて{n}日で届きました。", "発送が早く{n}日で届いています。",
      "発送が早くて注文から{n}日で届きました。",
      "発送が早いので{n}日で届きました。"], (1, 4)),
    ("同梱資料の品質が低い。",
     ["説明書が分かりにくいです。", "説明書が分かりにくかったです。",
      "説明書が分かりにくく設定に手間取りました。",
      "説明書が分かりにくいのが残念です。"], (1, 2)),
    ("問い合わせ窓口の品質が高い。",
     ["{brand}のサポート対応が丁寧でした。", "{brand}のサポート対応が丁寧です。",
      "{brand}のサポート対応が丁寧で助かりました。",
      "{brand}のサポート対応が丁寧だと感じました。"], (1, 2)),
]

FILLERS = [
    "家族へのプレゼント用に買いました。",
    "色は写真で見た印象とほぼ同じです。",
    "梱包はごく普通の段ボールでした。",
    "以前は別のメーカーの物を使っていました。",
    "週末にしか使っていないので耐久性はまだ分かりません。",
    "友人に勧められて購入を決めました。",
    "使い始めてまだ日が浅いです。",
    "箱は少し大きめでした。",
    "レビューを見てから買うか迷いました。",
    "自宅と職場の両方で使う予定です。",
    "同じ物をもう一つ買おうか検討中です。",
    "特に不満は今のところありません。",
]


def _fill(text, rng, brand):
    return text.replace("{brand}", brand)


def main():
    rng = np.random.default_rng(SEED)
    rows = []

    for i in range(400):
        brand = BRANDS[int(rng.integers(0, len(BRANDS)))]
        n_kp = int(rng.choice([2, 3], p=[0.45, 0.55]))
        kp_idx = rng.choice(len(KEY_POINTS), size=n_kp, replace=False)

        sentences = []
        summary_parts = []
        extractive_parts = []
        for k in kp_idx:
            canonical, paraphrases, (lo, hi) = KEY_POINTS[k]
            # 論点ごとに数値を1つ固定する(言い換え間で一貫させる)。
            # 範囲は論点ごとに違う(価格は円、電池は時間、発送は日)。
            num = str(int(rng.integers(lo, hi + 1)))
            canon = canonical.replace("{n}", num).replace("{brand}", brand)
            summary_parts.append(canon)
            # ★ 同じ論点を 2〜4 回言い換えて入れる(MMR が要る理由)
            n_rep = int(rng.integers(2, 5))
            chosen = rng.choice(paraphrases, size=min(n_rep, len(paraphrases)), replace=False)
            for p in chosen:
                sentences.append(p.replace("{n}", num).replace("{brand}", brand))
            # 抽出型の参照: その論点を代表する「文書中に実在する1文」
            extractive_parts.append(chosen[0].replace("{n}", num).replace("{brand}", brand))

        n_fill = int(rng.integers(4, 8))
        for f in rng.choice(FILLERS, size=n_fill, replace=False):
            sentences.append(_fill(f, rng, brand))

        rng.shuffle(sentences)
        document = "".join(sentences)
        summary = "".join(summary_parts)

        # 原文に無い数値・固有表現を混ぜた「壊れた要約」(ハルシネーション検知の教材)
        other = [b for b in BRANDS if b != brand]
        hallu = summary + f"なお{rng.choice(other)}製で保証は{int(rng.integers(50, 99))}か月です。"

        rows.append({
            "doc_id": f"D{i:04d}",
            "brand": brand,
            "n_sentences": len(sentences),
            "n_key_points": n_kp,
            "document": document,
            "reference_summary": summary,
            "extractive_reference": "".join(extractive_parts),
            "hallucinated_summary": hallu,
        })

    df = pd.DataFrame(rows)
    test = df.iloc[:100].reset_index(drop=True)
    train = df.iloc[100:].reset_index(drop=True)

    train.to_csv(OUT / "train.csv", index=False)
    test.drop(columns=["reference_summary", "extractive_reference"]).to_csv(
        OUT / "test.csv", index=False)

    answer_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    answer_dir.mkdir(parents=True, exist_ok=True)
    test[["doc_id", "reference_summary", "extractive_reference"]].to_csv(
        answer_dir / "_answer.csv", index=False)

    print("train", train.shape, "test", test.shape)
    print("1文書あたりの文数:", int(train["n_sentences"].min()), "〜", int(train["n_sentences"].max()),
          "(中央値", int(train["n_sentences"].median()), ")")
    print("論点数の分布:", train["n_key_points"].value_counts().sort_index().to_dict())
    print("\nサンプル文書(D0100):")
    r = train.iloc[0]
    import re
    for s in re.findall(r"[^。]*。", r["document"]):
        print("   ", s)
    print("  参照要約(抽象型):", r["reference_summary"])
    print("  参照要約(抽出型):", r["extractive_reference"])
    print("  壊れた要約:", r["hallucinated_summary"])


if __name__ == "__main__":
    main()
