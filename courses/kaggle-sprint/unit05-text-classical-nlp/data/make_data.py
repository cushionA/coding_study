"""unit05 の合成テキストデータを生成する(seed固定・再実行で同一結果)。

題材: Webから収集した中古品の出品テキスト(タイトル + 説明文)から、
      商品カテゴリ6クラスを当てる多クラス分類。

このユニットの主題は「テキストを数値にする」。そのため **正規化しないと精度が落ちる**
構造を意図的に仕込んである。素の TF-IDF と、正規化してからの TF-IDF でスコアが
目に見えて変わることが教材の核心。

  【汚れ1: 半角カタカナ】
    一定割合の行で、カテゴリを決定づける商品名詞が半角カタカナになる(テレビ → ﾃﾚﾋﾞ)。
    正規化しないと「テレビ」と「ﾃﾚﾋﾞ」が別語彙になり、同じ意味の語が2つに割れて
    特徴量が薄まる。NFKC 正規化で1つに統合される。

  【汚れ2: 全角英数字】
    TV → ＴＶ、4K → ４Ｋ のような全角化。これも NFKC で統合される。

  【汚れ3: HTMLの残渣】
    <br>, <b>, </b>, &amp;, &nbsp;, &lt; が残っている。除去しないと高頻度語として語彙を占める。

  【汚れ4: テンプレート文言】
    【送料無料】★即日発送★ ※返品不可 など、カテゴリと無関係な定型句が全カテゴリに一様に混ざる。

  【汚れ5: 表記ゆれの数値・単位】
    1,980円 / ¥1980 / 1980 円 / 1980yen が混在する。数値を1トークンに潰す前処理の教材。

  【汚れ6: 絵文字・記号の連打】
    ✨🔥💯!!! など。

  【混同しやすいクラス対】
    ファッションの「スニーカー/シューズ」とスポーツの「ランニングシューズ/シューズ」、
    ホビーの「写真集」と本・音楽の「写真集」、家電の「スピーカー」と本・音楽の「スピーカー」。
    クラス別 precision/recall と混同行列の読み方の教材になる。

  【クラス不均衡】
    最大クラスと最小クラスで約4倍の差。accuracy だけ見ると判断を誤る。

  【曖昧な出品タイトル】
    35%の行では商品名詞が「セット」「本体のみ」「ジャンク品」などの汎用語に置き換わり、
    直接の手がかりが消える。さらに40%の確率で修飾語も全カテゴリ共通のものになる。
    実際の出品タイトルはこの手の曖昧語が多く、これがあるおかげでタスクが自明でなくなる。

実行: python courses/kaggle-sprint/unit05-text-classical-nlp/data/make_data.py

--------------------------------------------------------------------------
実測済みの数値(教材の期待値はこれを正本とする)
--------------------------------------------------------------------------

janome で分かち書き → TfidfVectorizer(ngram_range=(1,2), min_df=2, sublinear_tf=True)
→ LogisticRegression(C=4.0) を StratifiedKFold(5) で評価:

    前処理              語彙数   accuracy   macro-F1
    ① 素のテキスト       4185     0.9237     0.9206
    ② 正規化してから     1857     0.9395     0.9379

  正規化の中身: NFKC(半角カナ・全角英数の統合)→ HTMLタグ/エンティティ除去
  → テンプレ記号・絵文字除去 → 価格の表記ゆれを <NUM> の1トークンに → 小文字化

  → **語彙が半分以下(4185→1857)になったうえで精度が上がる**のが教材の核心。
    「同じ意味の語が表記違いで別トークンに割れている」ことが、語彙数という
    1つの数字で可視化される。

  注意: macro-F1 を使うこと。クラス不均衡(最大/最小 ≈ 4.3倍)があるため、
  accuracy だけ見ると少数クラス(ベビー・キッズ)の失敗が見えない。
"""

from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20260805
OUT = Path(__file__).resolve().parent

# カテゴリごとの中心語彙。一部の語は複数カテゴリに意図的に重複させている。
NOUNS = {
    "家電": ["テレビ", "冷蔵庫", "洗濯機", "掃除機", "電子レンジ", "ドライヤー",
             "空気清浄機", "炊飯器", "エアコン", "スピーカー", "イヤホン"],
    "ファッション": ["ワンピース", "ジャケット", "スニーカー", "バッグ", "帽子",
                     "コート", "デニム", "ブーツ", "シャツ", "シューズ"],
    "ホビー": ["フィギュア", "プラモデル", "トレカ", "ボードゲーム", "ギター",
               "画材", "パズル", "ラジコン", "写真集"],
    "スポーツ": ["ラケット", "グローブ", "ランニングシューズ", "ヨガマット",
                 "ダンベル", "自転車", "スパイク", "ウェア", "シューズ"],
    "本・音楽": ["文庫本", "単行本", "レコード", "楽譜", "写真集", "画集",
                 "参考書", "雑誌", "スピーカー"],
    "ベビー・キッズ": ["ベビーカー", "チャイルドシート", "抱っこ紐", "絵本",
                       "おもちゃ", "ベビー服", "哺乳瓶"],
}

# カテゴリを補強する修飾語(中心語より弱い手がかり)
MODIFIERS = {
    "家電": ["4K", "省エネ", "静音", "リモコン付", "TV", "インバーター", "節電"],
    "ファッション": ["Mサイズ", "レディース", "メンズ", "古着", "ヴィンテージ", "厚底"],
    "ホビー": ["限定版", "未開封", "塗装済", "1/144", "初回特典", "コレクション"],
    "スポーツ": ["軽量", "27cm", "トレーニング", "屋外用", "硬式", "部活"],
    "本・音楽": ["初版", "帯付き", "全巻", "サイン入り", "廃盤", "名盤"],
    "ベビー・キッズ": ["新生児", "対象年齢3歳", "洗える", "安全基準適合", "軽量"],
}

# カテゴリを特定できない汎用名詞。実際の出品タイトルはこの手の曖昧語が多い。
# これが入った行は、弱い手がかり(修飾語)からカテゴリを推測するしかない。
GENERIC_NOUNS = ["セット", "本体のみ", "まとめ売り", "ジャンク品", "付属品あり",
                 "中古品", "訳あり品", "一式", "詰め合わせ"]

# 複数カテゴリにまたがる修飾語。単独ではカテゴリを決められない。
SHARED_MODIFIERS = ["軽量", "美品", "箱あり", "取説付", "動作確認済", "自宅保管",
                    "喫煙者なし", "ペットなし", "即決", "値下げ交渉可"]

CONDITION_WORDS = ["美品", "傷あり", "used", "ほぼ新品", "難あり", "状態良好"]
TEMPLATES = ["【送料無料】", "★即日発送★", "※返品不可", "◆匿名配送◆",
             "《まとめ買い歓迎》", "!!値下げしました!!", "【最終値下げ】"]
EMOJI = ["✨", "🔥", "💯", "⭐", "🎁"]

# 半角カタカナ変換表。濁点・半濁点は「基底文字 + ﾞ / ﾟ」の2文字に分解する
# (こうしないと NFKC で元に戻らない。ジ → ｼ にしてしまうと復元時に「シ」になる)。
_KANA_PLAIN = dict(zip(
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンーャュョッ",
    "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｰｬｭｮｯ",
))
_KANA_DAKUTEN = dict(zip(
    "ガギグゲゴザジズゼゾダヂヅデドバビブベボ",
    ["ｶ", "ｷ", "ｸ", "ｹ", "ｺ", "ｻ", "ｼ", "ｽ", "ｾ", "ｿ",
     "ﾀ", "ﾁ", "ﾂ", "ﾃ", "ﾄ", "ﾊ", "ﾋ", "ﾌ", "ﾍ", "ﾎ"],
))
_KANA_HANDAKU = dict(zip("パピプペポ", ["ﾊ", "ﾋ", "ﾌ", "ﾍ", "ﾎ"]))

FULL_TO_HALF_KANA = {}
for _k, _v in _KANA_PLAIN.items():
    FULL_TO_HALF_KANA[ord(_k)] = _v
for _k, _v in _KANA_DAKUTEN.items():
    FULL_TO_HALF_KANA[ord(_k)] = _v + "ﾞ"
for _k, _v in _KANA_HANDAKU.items():
    FULL_TO_HALF_KANA[ord(_k)] = _v + "ﾟ"
ASCII_TO_FULL = str.maketrans(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/",
    "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
    "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ／",
)


def _price_text(rng, price):
    style = rng.integers(0, 4)
    if style == 0:
        return f"{price:,}円"
    if style == 1:
        return f"¥{price}"
    if style == 2:
        return f"{price} 円"
    return f"{price}yen"


def _make_row(rng, cat):
    cond = rng.choice(CONDITION_WORDS)
    price = int(rng.integers(3, 400)) * 100

    # 35% の行はカテゴリ名詞が汎用語に置き換わる(= 直接の手がかりが消える)。
    # このとき修飾語だけが弱い手がかりになる。実際の出品タイトルはこの手の曖昧語が多い。
    vague = rng.random() < 0.35
    noun = rng.choice(GENERIC_NOUNS) if vague else rng.choice(NOUNS[cat])

    # 修飾語も 40% の確率で全カテゴリ共通のものに置き換わる。
    mod = (rng.choice(SHARED_MODIFIERS) if rng.random() < 0.40
           else rng.choice(MODIFIERS[cat]))
    mod2 = (rng.choice(SHARED_MODIFIERS) if rng.random() < 0.40
            else rng.choice(MODIFIERS[cat]))

    title = f"{mod} {noun} {cond}"
    # 説明文はタイトルの繰り返しにしない。半分の行では商品名詞を出さない。
    if vague or rng.random() < 0.5:
        body = (f"{cond}な状態でお譲りします。お値段は{_price_text(rng, price)}になります。"
                f"{mod2}ですので気になる方はご検討ください。")
    else:
        body = (f"{rng.choice(NOUNS[cat])}です。{cond}。"
                f"{_price_text(rng, price)}。{mod2}。")

    # --- 汚れの注入 ---
    if rng.random() < 0.30:  # 汚れ1: 半角カタカナ(中心語が別トークンに割れる)
        title = title.translate(FULL_TO_HALF_KANA)
    if rng.random() < 0.25:  # 汚れ2: 全角英数字
        title = title.translate(ASCII_TO_FULL)
        body = body.translate(ASCII_TO_FULL)
    if rng.random() < 0.45:  # 汚れ3: HTML残渣
        body = rng.choice(["<b>", "<br>", "&nbsp;"]) + body + rng.choice(["<br>", "</b>", "&amp;"])
    if rng.random() < 0.55:  # 汚れ4: テンプレート文言
        title = rng.choice(TEMPLATES) + title
    if rng.random() < 0.30:  # 汚れ6: 絵文字
        title = title + "".join(rng.choice(EMOJI, size=int(rng.integers(1, 4))))
    if rng.random() < 0.20:  # 余分な空白
        title = title.replace(" ", "   ")

    return title, body, price


def main():
    rng = np.random.default_rng(SEED)
    cats = list(NOUNS)
    # クラス不均衡(最大 / 最小 ≈ 4倍)
    weights = np.array([0.26, 0.24, 0.17, 0.15, 0.12, 0.06])

    n_total = 5000
    labels = rng.choice(cats, size=n_total, p=weights)

    rows = []
    for i, cat in enumerate(labels):
        title, body, price = _make_row(rng, cat)
        rows.append((f"L{i:05d}", title, body, price, cat))

    df = pd.DataFrame(rows, columns=["listing_id", "title", "description", "price", "category"])
    df = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    n_test = 1000
    test = df.iloc[:n_test].reset_index(drop=True)
    train = df.iloc[n_test:].reset_index(drop=True)

    answer = test[["listing_id", "category"]].copy()
    test = test.drop(columns=["category"])

    sample_submission = pd.DataFrame(
        {"listing_id": test["listing_id"], "category": train["category"].mode()[0]}
    )

    train.to_csv(OUT / "train.csv", index=False)
    test.to_csv(OUT / "test.csv", index=False)
    sample_submission.to_csv(OUT / "sample_submission.csv", index=False)

    answer_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    answer_dir.mkdir(parents=True, exist_ok=True)
    answer.to_csv(answer_dir / "_answer.csv", index=False)

    print("train", train.shape, "test", test.shape)
    print("\nクラス分布(train):")
    print(train["category"].value_counts().to_string())
    print("\n不均衡比(最大/最小):",
          round(train["category"].value_counts().max() / train["category"].value_counts().min(), 2))
    print("\n半角カタカナを含む行:", int(train["title"].str.contains("[ｦ-ﾟ]", regex=True).sum()))
    print("全角英数字を含む行  :", int(train["title"].str.contains("[Ａ-Ｚａ-ｚ０-９]", regex=True).sum()))
    print("HTML残渣を含む行    :", int(train["description"].str.contains("<|&", regex=True).sum()))
    print("テンプレ文言を含む行:", int(train["title"].str.contains("【|★|※|◆|《", regex=True).sum()))
    print("\nサンプル:")
    for t in train["title"].head(6):
        print("  ", t)


if __name__ == "__main__":
    main()
