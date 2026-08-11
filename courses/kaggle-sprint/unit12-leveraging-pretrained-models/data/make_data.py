"""unit12(既存モデルの活用 / RAG)の合成データを生成する(seed固定・再実行で同一結果)。

題材: 商品の仕様書・FAQ を知識ベースにして、顧客からの質問に答える。
      「借りてきたモデル」に何を渡せば正しく答えられるか、を扱うための土台。

このユニットの主題は **検索して文脈を与える(RAG)** こと。したがって
「検索が当たったか」を機械的に採点できる正解が要る。そのため質問には
**答えの根拠となる passage_id** を持たせてある。

  【知識ベース(kb.csv)】
    1商品につき4種類の節(仕様 / 保証 / 付属品 / 注意事項)。
    各節に1つの「事実」が入っており、質問はその事実を問う。

  【仕込んだ罠】

  1. 似た型番の別商品(検索が最も間違えやすい)
     `XR-500B` と `XR-500C` のように1文字違いの型番が存在する。
     単語一致だけで検索すると別商品の節を拾い、**もっともらしいが間違った答え**になる。

  2. 答えが知識ベースに無い質問(全体の18%)
     `answer_passage_id` が空。**「分かりません」と答えるのが正解**であり、
     何か答えてしまったら不正解、という設計。RAG で最も実害が出るのがここ。

  3. 同じ数値が複数商品に出てくる
     保証月数や重量は商品をまたいで重複する。数値だけを見て照合すると
     取り違える。どの商品の節かを見ないと正解にならない。

  4. 言い換えられた質問(全体の40%)
     知識ベースの語彙と質問の語彙をずらしてある(「重さ」↔「重量」、
     「返品」↔「返送」)。単語一致の検索では拾えず、意味を捉える検索が要る。
     unit06 の「層3」と同じ仕掛けで、古典検索 → 埋め込み検索の動機になる。

【オフライン制約】
事前学習済み重みはこの環境では取得できない(組織のエグレスポリシーで 403)。
そのため埋め込みは unit06 と同じ **疑似埋め込み**(vocab.csv の意味グループごとに
中心ベクトル + ノイズ)を使う。検索の仕組みとその評価は完全に本物で学べる。

実行: python courses/kaggle-sprint/unit12-leveraging-pretrained-models/data/make_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260812
OUT = Path(__file__).resolve().parent

CATEGORIES = ["ワイヤレスイヤホン", "冷蔵庫", "掃除機", "ノートパソコン", "腕時計"]
BRANDS = ["アカネ電機", "ソライロ", "ミドリワークス", "ハヤブサ", "ノースピーク"]

# (節の種類, 事実を書く型, 質問の型, 言い換えた質問の型)
SECTIONS = [
    ("仕様",
     "{model} の重量は {v} グラムです。",
     "{model} の重量は何グラムですか。",
     "{model} はどのくらいの重さですか。"),
    ("保証",
     "{model} のメーカー保証期間は {v} か月です。",
     "{model} の保証期間は何か月ですか。",
     "{model} はどれくらいの期間サポートを受けられますか。"),
    ("付属品",
     "{model} には専用ケースと充電ケーブルが {v} 本同梱されます。",
     "{model} に付属するケーブルは何本ですか。",
     "{model} を買うとコードは何本ついてきますか。"),
    ("注意事項",
     "{model} は開封後 {v} 日以内であれば返品を受け付けます。",
     "{model} は何日以内なら返品できますか。",
     "{model} の返送はいつまで可能ですか。"),
]

# 答えが知識ベースに無い質問(「分かりません」が正解)。
# ★語彙をわざと知識ベースと重ねてある。「防水ですか」のように全く重ならない語で作ると、
#   類似度がゼロになってどんな閾値でも100%分離できてしまい、閾値設計の教材にならない
#   (初版がその失敗をした)。ここでは「仕様を問う質問だが、その項目は記録されていない」
#   という、実務で最も多い形にしてある。
UNANSWERABLE = [
    "{model} の消費電力は何ワットですか。",       # 仕様節はあるが電力は記録が無い
    "{model} の保証は延長できますか。",            # 保証節はあるが延長可否の記録が無い
    "{model} に付属するケースの色は何色ですか。",  # 付属品節はあるが色の記録が無い
    "{model} は返品時に送料がかかりますか。",      # 注意事項節はあるが送料の記録が無い
    "{model} の重量は梱包込みで何グラムですか。",  # 重量はあるが梱包込みの記録が無い
]

# 疑似埋め込み用の語彙。同じ sense_group の語は近いベクトルになる。
# ★話題の語だけでなく **型番も語彙に入れる**。入れないと同じ節の passage が
#   全部同一ベクトルになり、720件から1件を選べない(初版がその失敗をした)。
#   型番の sense_group は make_data の中で商品ごとに払い出す。
TOPIC_VOCAB = [
    ("重量", 0), ("重さ", 0), ("グラム", 0), ("梱包", 0),
    ("保証", 1), ("サポート", 1), ("か月", 1), ("期間", 1), ("延長", 1),
    ("付属", 2), ("同梱", 2), ("ケーブル", 2), ("コード", 2), ("本", 2), ("ケース", 2), ("色", 2),
    ("返品", 3), ("返送", 3), ("日以内", 3), ("開封", 3), ("送料", 3),
    ("消費電力", 4), ("ワット", 4),
]


def main():
    rng = np.random.default_rng(SEED)

    # --- 商品マスタ。型番は「1文字違い」のペアを意図的に作る(罠1)---
    products = []
    for i in range(90):
        base = f"{chr(65 + i % 26)}{rng.integers(100, 999)}"
        for suffix in ("B", "C"):                      # XR-500B と XR-500C
            products.append({
                "product_key": f"P{len(products):04d}",
                "model": f"{base}-{suffix}",
                "category": CATEGORIES[int(rng.integers(0, len(CATEGORIES)))],
                "brand": BRANDS[int(rng.integers(0, len(BRANDS)))],
            })
    products = pd.DataFrame(products)

    # --- 知識ベース: 1商品 × 4節 ---
    kb, facts = [], {}
    for p in products.itertuples(index=False):
        for sec, fact_t, _, _ in SECTIONS:
            # 罠3: 値は狭い範囲から引くので商品をまたいで重複する
            v = {"仕様": int(rng.integers(120, 460)),
                 "保証": int(rng.choice([6, 12, 18, 24, 36])),
                 "付属品": int(rng.integers(1, 4)),
                 "注意事項": int(rng.choice([7, 8, 14, 30]))}[sec]
            pid = f"K{len(kb):05d}"
            kb.append({"passage_id": pid, "product_key": p.product_key, "model": p.model,
                       "category": p.category, "brand": p.brand, "section": sec,
                       "text": fact_t.format(model=p.model, v=v)})
            facts[(p.product_key, sec)] = (pid, v)
    kb = pd.DataFrame(kb)

    # --- 質問 ---
    qs = []
    for i in range(600):
        p = products.iloc[int(rng.integers(0, len(products)))]
        if rng.random() < 0.18:                                    # 罠2: 答えられない質問
            q = rng.choice(UNANSWERABLE).format(model=p["model"])
            qs.append({"question_id": f"Q{i:04d}", "question": q, "model": p["model"],
                       "product_key": p["product_key"],
                       "answer_passage_id": "", "answer_value": "", "answerable": 0,
                       "paraphrased": 0})
        else:
            sec, _, q_t, q_para = SECTIONS[int(rng.integers(0, len(SECTIONS)))]
            para = rng.random() < 0.40                             # 罠4: 言い換え
            q = (q_para if para else q_t).format(model=p["model"])
            pid, v = facts[(p["product_key"], sec)]
            qs.append({"question_id": f"Q{i:04d}", "question": q, "model": p["model"],
                       "product_key": p["product_key"],
                       "answer_passage_id": pid, "answer_value": str(v), "answerable": 1,
                       "paraphrased": int(para)})
    qs = pd.DataFrame(qs).sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    # 型番を語彙に追加する。1文字違いの兄弟型番(A495-B と A495-C)は
    # **意味グループ番号を隣接させて**、埋め込み空間でも紛らわしくなるようにする。
    # これがないと「似た型番を取り違える」という現実の失敗が再現できない。
    vocab_rows = [{"token": t, "sense_group": g} for t, g in TOPIC_VOCAB]
    base_ids = {}
    for m in products["model"]:
        base = m[:-1]
        if base not in base_ids:
            base_ids[base] = 100 + len(base_ids) * 2
        # -B は base_id、-C は base_id+1。近い番号 = 近い中心ベクトル(生成側で近接させる)
        vocab_rows.append({"token": m, "sense_group": base_ids[base] + (0 if m.endswith("B") else 1)})
    vocab = pd.DataFrame(vocab_rows)

    test = qs.iloc[:150].reset_index(drop=True)
    train = qs.iloc[150:].reset_index(drop=True)

    kb.to_csv(OUT / "kb.csv", index=False)
    vocab.to_csv(OUT / "vocab.csv", index=False)
    train.to_csv(OUT / "questions_train.csv", index=False)
    test.drop(columns=["answer_passage_id", "answer_value", "answerable"]).to_csv(
        OUT / "questions_test.csv", index=False)

    ans_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    ans_dir.mkdir(parents=True, exist_ok=True)
    test[["question_id", "answer_passage_id", "answer_value", "answerable"]].to_csv(
        ans_dir / "_answer.csv", index=False)

    print("kb", kb.shape, "| 商品数", len(products), "| 質問 train", train.shape, "test", test.shape)
    print("答えられない質問の割合:", round(1 - train["answerable"].mean(), 3))
    print("言い換えられた質問の割合(答えられるもののうち):",
          round(train.loc[train["answerable"] == 1, "paraphrased"].mean(), 3))
    dup = kb.groupby("section")["text"].apply(lambda s: s.str.extract(r"(\d+)")[0].duplicated().mean())
    print("同じ数値が他商品と重複する割合:", {k: round(v, 3) for k, v in dup.items()})
    same = products["model"].str[:-1].duplicated(keep=False).mean()
    print("1文字違いの型番を持つ商品の割合:", round(same, 3))
    print("\n知識ベースの例:"); print("  ", kb["text"].iat[0]); print("  ", kb["text"].iat[1])
    print("質問の例:")
    for _, r in train.head(4).iterrows():
        print(f"   [{'答えあり' if r['answerable'] else '答えなし'}] {r['question']}")


if __name__ == "__main__":
    main()
