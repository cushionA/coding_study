"""unit10 の lesson.ipynb を生成する。

方針: 期待値の計算と notebook 生成をこのスクリプトの中で同時に行い、
チェックポイントの期待値はリテラルとして埋め込む。

題材: Day5 で作った「出品テキスト → カテゴリ6クラス」を土台に、
      OOFブレンド / スタッキング / シード平均 / 学習と推論の分離 / コスト設計 を通す。
"""
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
import nbformat as nbf

ROOT = Path("/home/user/coding_study")
UNIT = ROOT / "courses/kaggle-sprint/unit10-capstone-ensemble-and-serving"
DATA = ROOT / "courses/kaggle-sprint/unit05-text-classical-nlp/data"

# ---------------------------------------------------------------- 参照値の計算
sys.path.insert(0, str(ROOT))
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.decomposition import TruncatedSVD
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import f1_score, accuracy_score
import lightgbm as lgb

SP = re.compile(r"\s+")
TOK = Tokenizer()


def normalize(s):
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&[a-z]+;", " ", s)
    s = re.sub(r"[【】★※◆《》!!]+", " ", s)
    s = re.sub(r"[✨🔥💯⭐🎁]+", " ", s)
    s = re.sub(r"[¥￥]?[\d,]+\s*(円|yen)?", " <num> ", s)
    return SP.sub(" ", s).strip().lower()


tr = pd.read_csv(DATA / "train.csv")
y = tr["category"].to_numpy()
CLASSES = sorted(set(y))
docs = [normalize(a + " " + b) for a, b in zip(tr["title"], tr["description"])]
wak = [" ".join(t.surface for t in TOK.tokenize(d)) for d in docs]
cv = StratifiedKFold(5, shuffle=True, random_state=0)

Xw = TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True).fit_transform(wak)
Xc = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True).fit_transform(docs)
Xs = TruncatedSVD(128, random_state=0).fit_transform(Xc)

P_word = cross_val_predict(LogisticRegression(max_iter=2000, C=4.0), Xw, y, cv=cv, method="predict_proba")
P_char = cross_val_predict(LogisticRegression(max_iter=2000, C=4.0), Xc, y, cv=cv, method="predict_proba")
P_lgbm = cross_val_predict(lgb.LGBMClassifier(n_estimators=150, learning_rate=0.12, verbose=-1, random_state=0),
                           Xs, y, cv=cv, method="predict_proba")


def macro_f1(P):
    return float(f1_score(y, np.array(CLASSES)[P.argmax(1)], average="macro"))


F_WORD, F_CHAR, F_LGBM = macro_f1(P_word), macro_f1(P_char), macro_f1(P_lgbm)
F_AVG3 = macro_f1((P_word + P_char + P_lgbm) / 3)

# ⑦-1: 語+文字 の2モデルブレンド重み探索
grid = np.arange(0.0, 1.0001, 0.05)
scores = [(round(float(w), 2), macro_f1(w * P_word + (1 - w) * P_char)) for w in grid]
BEST_W, BEST_F = max(scores, key=lambda t: t[1])
BEST_F = round(BEST_F, 6)

# ⑦-2: スタッキング(OOF確率を特徴量にしたメタモデル)
META_X = np.hstack([P_word, P_char, P_lgbm])
P_stack = cross_val_predict(LogisticRegression(max_iter=2000, C=1.0), META_X, y, cv=cv, method="predict_proba")
F_STACK = round(macro_f1(P_stack), 6)
N_META_COLS = int(META_X.shape[1])

# ⑦-4: 損益分岐(月あたり件数)
API_IN, API_OUT = 500, 5           # 1件あたりトークン
API_IN_USD, API_OUT_USD = 3.0, 15.0  # 100万トークンあたりUSD
GPU_USD_H, GPU_HOURS, RETRAIN = 1.20, 3.0, 2   # 学習: 時間単価 / 1回の時間 / 月の回数
CPU_USD_H, CPU_HOURS = 0.05, 720.0             # 推論: 時間単価 / 月の稼働時間
SELF_MONTHLY = GPU_USD_H * GPU_HOURS * RETRAIN + CPU_USD_H * CPU_HOURS
API_PER_ITEM = API_IN / 1e6 * API_IN_USD + API_OUT / 1e6 * API_OUT_USD
BREAK_EVEN = int(np.ceil(SELF_MONTHLY / API_PER_ITEM))
SELF_MONTHLY_R = round(SELF_MONTHLY, 2)
API_PER_ITEM_R = round(API_PER_ITEM, 8)

print("=== 参照値 ===")
print(f"語 {F_WORD:.4f} / 文字 {F_CHAR:.4f} / LGBM {F_LGBM:.4f} / 3平均 {F_AVG3:.4f}")
print(f"最適重み w={BEST_W} → {BEST_F:.6f} / スタッキング {F_STACK:.6f} (meta列 {N_META_COLS})")
print(f"自前 月額 ${SELF_MONTHLY_R} / API 1件 ${API_PER_ITEM_R} / 損益分岐 {BREAK_EVEN:,} 件")

# ---------------------------------------------------------------- notebook 生成
md = nbf.v4.new_markdown_cell
co = nbf.v4.new_code_cell
cells = []

cells.append(md(f"""# unit10 レッスン: キャップストーン — アンサンブルと推論のコスト設計

**10日間の締めくくり。** ここまでで、信じられる CV(Day2)、主砲のモデル(Day3)、
特徴量(Day4)、テキストの扱い(Day5〜7)、画像(Day8〜9)を手に入れた。
今日はそれらを**1本の運用できる流れ**にまとめる。

題材は Day5 の「出品テキスト → カテゴリ6クラス」をそのまま使う。
すでに3つの異なるモデルが作れる状態なので、**混ぜる**題材としてちょうどいい。

## このレッスンを終えると作れるようになるもの

1. 複数モデルの **OOF 予測**を使って、ブレンドの重みを**手元のデータだけで**決められる
2. 「全部混ぜれば良くなる」が**嘘**であることを自分の手で確かめ、重みの決め方を説明できる
3. 学習と推論を **artifact** で分離し、再現性を確認できる
4. **GPU で学習し CPU で推論する自前構成**と **LLM API 従量課金**の損益分岐を計算できる

所要の目安: **90〜120分**。このあと演習 `ex01`〜`ex04` が続く。
"""))

cells.append(co(f'''# ===== セットアップ: このセルを最初に1回だけ実行する(30秒ほどかかる)=====
from pathlib import Path
import re
import time
import unicodedata

import numpy as np
import pandas as pd

pd.set_option("display.width", 170)

DATA = Path("../unit05-text-classical-nlp/data")
if not (DATA / "train.csv").exists():
    DATA = Path("courses/kaggle-sprint/unit05-text-classical-nlp/data")
assert (DATA / "train.csv").exists(), f"train.csv が見つかりません: {{DATA.resolve()}}"

_UNIT_DIR = DATA.resolve().parent
ANSWER = _UNIT_DIR.parent / ".solutions" / _UNIT_DIR.name / "_answer.csv"
OUT = Path("output")
OUT.mkdir(exist_ok=True)
print("DATA =", DATA.resolve())


# ---------- 採点ヘルパー(中身は読まなくてよい) ----------
def check(name, actual, expected, hint=""):
    import numpy as _np
    try:
        ok = actual is not None and bool(_np.all(_np.isclose(
            _np.asarray(actual, dtype=float), _np.asarray(expected, dtype=float), atol=1e-6)))
    except (TypeError, ValueError):
        ok = actual == expected
    if ok:
        print(f"[OK] {{name}}: 正解!")
    else:
        print(f"[NG] {{name}}: 期待値 {{expected!r}} / 実際 {{actual!r}}")
        if hint:
            print(f"     ヒント: {{hint}}")
    return ok


def call_safely(fn, *args, **kwargs):
    """未完成の関数を呼んでも notebook が止まらないようにするラッパ。"""
    if not callable(fn):
        return None
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        print(f"     (関数の中で例外 → {{type(e).__name__}}: {{e}})")
        return None


# ---------- Day5 と同じ前処理で3つのモデルの OOF を作る ----------
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.decomposition import TruncatedSVD
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import f1_score, accuracy_score, classification_report
import lightgbm as lgb

SP = re.compile(r"\\s+")
TOK = Tokenizer()


def normalize(s):
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&[a-z]+;", " ", s)
    s = re.sub(r"[【】★※◆《》!!]+", " ", s)
    s = re.sub(r"[✨🔥💯⭐🎁]+", " ", s)
    s = re.sub(r"[¥￥]?[\\d,]+\\s*(円|yen)?", " <num> ", s)
    return SP.sub(" ", s).strip().lower()


_t = time.time()
train = pd.read_csv(DATA / "train.csv")
y = train["category"].to_numpy()
CLASSES = sorted(set(y))
DOCS = [normalize(a + " " + b) for a, b in zip(train["title"], train["description"])]
WAKATI = [" ".join(t.surface for t in TOK.tokenize(d)) for d in DOCS]
CV = StratifiedKFold(5, shuffle=True, random_state=0)

Xw = TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True).fit_transform(WAKATI)
Xc = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True).fit_transform(DOCS)
Xs = TruncatedSVD(128, random_state=0).fit_transform(Xc)

P_word = cross_val_predict(LogisticRegression(max_iter=2000, C=4.0), Xw, y, cv=CV, method="predict_proba")
P_char = cross_val_predict(LogisticRegression(max_iter=2000, C=4.0), Xc, y, cv=CV, method="predict_proba")
P_lgbm = cross_val_predict(lgb.LGBMClassifier(n_estimators=150, learning_rate=0.12, verbose=-1, random_state=0),
                           Xs, y, cv=CV, method="predict_proba")


def macro_f1(P):
    """確率行列 (n, クラス数) を受け取り macro-F1 を返す。"""
    return float(f1_score(y, np.array(CLASSES)[P.argmax(1)], average="macro"))


print(f"OOF の準備完了({{time.time() - _t:.0f}} 秒)")
print("P_word / P_char / P_lgbm の形:", P_word.shape, "= (行数, クラス数)")
print("クラスの並び:", CLASSES)
print("\\nセットアップ完了。ヘルパー: check / call_safely / macro_f1")'''))

# ============================================================ 概念1
cells.append(md("""## ① なぜ: 最後の一押しは「混ぜる」で稼ぐ

コンペの終盤、単体モデルの改善は頭打ちになる。そこから先で効くのが**アンサンブル**だ。
違う見方をしている複数のモデルの予測を混ぜると、それぞれの誤りが打ち消し合って精度が上がる。

実務でも同じ形が出てくる。「ルールベースの判定」と「機械学習の判定」を併用して、
両方が同意したものだけ自動処理し、割れたものを人間に回す — これも立派なアンサンブルだ。

**だが混ぜ方を間違えると精度は下がる。** 今日はそこを実測で確かめる。"""))

cells.append(md("""## ② 解説: OOF がなければ重みは決められない

3つのモデルを 0.5 / 0.3 / 0.2 の重みで混ぜたい。この重みはどう決める?

**学習データでの予測を使ってはいけない。** モデルは学習データを覚えているので、
そこでの精度は本番と無関係だ。重みを決めるには「**そのモデルが見ていないデータでの予測**」が要る。
それが Day2 で作った **OOF 予測**(out-of-fold prediction)だ。

| やりたいこと | 使うもの | 理由 |
|---|---|---|
| モデル単体の実力を測る | OOF 予測 | 学習に使っていない行での予測だから |
| ブレンドの重みを決める | OOF 予測 | 同上。重み探索も「手元での最適化」なので過学習しうる |
| 本番の予測を作る | 全データで再学習したモデル | 手元のデータを使い切る |

C#で言えば、OOF は「各インスタンスについて、**そのインスタンスを訓練に含めなかったモデル**が出した予測」を
1本の配列に詰め直したもの。`Dictionary<行番号, 予測>` を fold ごとに埋めていくイメージだ。

このレッスンでは3つのモデルの OOF を**セットアップ済み**にしてある(`P_word` / `P_char` / `P_lgbm`)。
いずれも `(4000, 6)` の**確率行列**で、行が出品、列がクラスだ。

| 変数 | モデル | 見ているもの |
|---|---|---|
| `P_word` | 語 TF-IDF + ロジスティック回帰 | janome で切った**単語**の並び |
| `P_char` | 文字 TF-IDF + ロジスティック回帰 | **文字 n-gram**(分かち書きに依存しない) |
| `P_lgbm` | SVD 128次元 + LightGBM | 文字 n-gram を**圧縮した密ベクトル**の非線形な組み合わせ |"""))

cells.append(co(f'''# GOAL: 3つのモデルの単体性能と、素朴に平均したときの性能を比べる

# STEP 1: 単体の macro-F1 を出す
print("--- 単体の性能 ---")
for name, P in (("語TF-IDF   ", P_word), ("文字TF-IDF ", P_char), ("SVD+LightGBM", P_lgbm)):
    print(f"  {{name}} macro-F1 = {{macro_f1(P):.4f}}")

# STEP 2: 3つを素朴に等分で平均する
P_avg3 = (P_word + P_char + P_lgbm) / 3
print(f"\\n--- 3モデルを等分で平均 ---")
print(f"  macro-F1 = {{macro_f1(P_avg3):.4f}}")

# STEP 3: 単体最良と比べる
best_single = max(macro_f1(P_word), macro_f1(P_char), macro_f1(P_lgbm))
print(f"\\n  単体最良 = {{best_single:.4f}} / 3つの平均 = {{macro_f1(P_avg3):.4f}}")
print(f"  差 = {{macro_f1(P_avg3) - best_single:+.4f}}")'''))

cells.append(md("""## ④ 予測: 2つだけ混ぜたらどうなる?

③ の結果を見てから答えてほしい。

1. 3つ全部を等分で混ぜた結果は、単体最良より**良かった? 悪かった?**
2. そうなった理由は何だと思う? 3つのモデルの単体性能をもう一度見てほしい
3. では **`P_word` と `P_char` の2つだけ**を等分で混ぜたら、単体最良を超えると思う?
4. 混ぜて得をするのはどういうときで、損をするのはどういうときだろう?

> ヒント: 平均は「全員の意見を同じ重みで聞く」こと。会議に**明らかに間違いが多い人**が
> 1人混ざっていて、その人の意見も同じ重みで採用したら、結論はどうなるだろうか。"""))

cells.append(co('''# GOAL: 混ぜる相手を変えると結果がどう動くかを見る

combos = {
    "語 のみ": P_word,
    "文字 のみ": P_char,
    "LightGBM のみ": P_lgbm,
    "語 + 文字": (P_word + P_char) / 2,
    "語 + LightGBM": (P_word + P_lgbm) / 2,
    "文字 + LightGBM": (P_char + P_lgbm) / 2,
    "3つ全部": (P_word + P_char + P_lgbm) / 3,
}
print(f"{'組み合わせ':<18s} macro-F1")
print("-" * 32)
for name, P in combos.items():
    print(f"{name:<18s} {macro_f1(P):.4f}")

print("\\n→ 弱いモデル(LightGBM)を等分で混ぜた組み合わせは、いずれも足を引っ張られている。")
print("  『全部混ぜれば良くなる』は嘘。混ぜる相手と重みを選ぶ必要がある。")'''))

cells.append(md(f"""## ⑥ 書いてみる: OOF で重みを決める

等分で混ぜるのをやめて、**手元の OOF で重みを探索**しよう。
`P_word` と `P_char` の2モデルを `w` と `1 - w` で混ぜる。

次のセルで2つ作ろう。

| 変数 | 中身 |
|---|---|
| `blend_scores` | `(w, macro_f1)` のタプルの**リスト**。`w` は `0.0` から `1.0` まで **0.05 刻み**(21個) |
| `best_w`, `best_f1` | `blend_scores` の中で macro-F1 が**最大**になる `w` とそのスコア |

使う道具:

- `np.arange(0.0, 1.0001, 0.05)` — 0.05刻みの配列。終端を含めるため上限を少し大きくしている
- `round(float(w), 2)` — 浮動小数の誤差で `0.35000000000000003` にならないように丸める
- `macro_f1(w * P_word + (1 - w) * P_char)` — 混ぜた確率行列を採点する
- `max(リスト, key=lambda t: t[1])` — タプルの2番目が最大の要素を選ぶ(C# の `MaxBy` 相当)

**4〜6行**で書ける。書けたら `best_w` を眺めて、「2つのモデルのうちどちらを重く見るべきか」を
単体性能の表と照らし合わせてほしい。"""))

cells.append(co('''blend_scores = None   # (w, macro_f1) のリスト
best_w = None
best_f1 = None
# ここに書く(ヒント: np.arange(0.0, 1.0001, 0.05) を回して (round(float(w), 2), macro_f1(...)) を集め、
#           max(..., key=lambda t: t[1]) で最良を取る)


if isinstance(blend_scores, list) and blend_scores:
    print(f"探索した重みの数: {len(blend_scores)}")
    for w, f in blend_scores[::4]:
        print(f"  w={w:.2f}  macro-F1={f:.4f}")
print("best_w :", best_w, " best_f1:", best_f1)'''))

cells.append(co(f'''# ===== チェックポイント A: OOFで重みを決める =====
check("A-1 探索した重みの個数", None if blend_scores is None else len(blend_scores), 21,
      hint="np.arange(0.0, 1.0001, 0.05) の要素数。1.0 を含めるので 21 個になる。")

check("A-2 最良の重み best_w", best_w, {BEST_W},
      hint="round(float(w), 2) で丸めてからタプルに入れる。")

check("A-3 最良のスコア best_f1", best_f1, {BEST_F},
      hint="macro_f1(w * P_word + (1 - w) * P_char) の最大値。")

check("A-4 単体最良({F_CHAR:.4f})を超えたか", 1.0 if (best_f1 or 0) > {F_CHAR:.6f} else 0.0, 1.0,
      hint="超えていなければ重み探索の式を見直す。w が P_word 側の重みであることに注意。")

print("\\n(4つとも [OK] になったら次の概念へ)")'''))

# ============================================================ 概念2
cells.append(md("""## ① なぜ: 混ぜて効くかどうかは「相関」で決まる

なぜ「語 + 文字」は効いて「3つ全部」は効かなかったのか。
アンサンブルが効く条件は2つあり、**両方**が要る。

1. 各モデルが**それなりに強い**こと
2. 各モデルの誤りが**似ていない**こと(= 予測の相関が低い)

同じ間違いをする2人を集めても意見は変わらない。違う見方をしていて初めて誤りが打ち消し合う。
実務で「ルールベース + 機械学習」の併用が効くのは、**誤り方がまったく違う**からだ。"""))

cells.append(md("""## ② 解説: 相関を見る、そしてスタッキング

**予測の相関**を見れば、混ぜる価値があるかが事前に分かる。相関が 0.99 なら、
それはほぼ同じモデルであり、混ぜても意味がない。

重みを手で探索する代わりに、**メタモデルに決めさせる**やり方もある。これが**スタッキング**だ。

```
[ P_word (6列) | P_char (6列) | P_lgbm (6列) ]  →  メタモデル  →  最終予測
              18列の特徴量行列
```

各モデルの OOF 確率を横に並べて特徴量行列にし、その上でもう1つモデルを学習する。
重み付き平均は「メタモデルが線形で、各クラスに同じ重みを掛ける」特殊ケースにすぎない。
スタッキングなら「このクラスのときは文字モデルを信じる」といった**クラスごとの使い分け**まで学習できる。

C#で言えば、複数の判定器の出力を受け取って最終判断を下す `IDecisionAggregator` を、
手書きのルールではなく**データから学習させる**イメージだ。

> **注意**: メタモデルの学習に使うのは必ず **OOF 予測**。学習データでの予測を並べると、
> 「よく当たる特徴量」に見えてしまい、メタモデルがそれを過信する。Day2 のリークと同じ構図だ。"""))

cells.append(co('''# GOAL: 予測の相関を見て、混ぜる価値がある組み合わせを見分ける

# STEP 1: OOF 確率行列を平らにして相関を取る
pairs = [("語", P_word, "文字", P_char), ("語", P_word, "LGBM", P_lgbm), ("文字", P_char, "LGBM", P_lgbm)]
print("--- OOF 予測どうしの相関 ---")
for n1, A, n2, B in pairs:
    r = np.corrcoef(A.ravel(), B.ravel())[0, 1]
    print(f"  {n1:4s} vs {n2:4s}  相関 = {r:.4f}")

# STEP 2: 「予測が食い違った行」の数を数える(相関より直感的な指標)
lab = lambda P: np.array(CLASSES)[P.argmax(1)]
print("\\n--- 予測ラベルが食い違った行数(全4000行中)---")
for n1, A, n2, B in pairs:
    print(f"  {n1:4s} vs {n2:4s}  {int((lab(A) != lab(B)).sum()):4d} 行")

print("\\n→ 相関が高くても、食い違う行が数百あるなら混ぜる余地はある。")
print("  逆に食い違いがほぼ無いなら、それは同じモデルを2回数えているだけ。")'''))

cells.append(md("""## ④ 予測: メタモデルは手探索を超えるか

次のセルでスタッキングを実際に動かす。実行する前に予測してほしい。

1. 18列の特徴量(3モデル × 6クラス)でメタモデルを学習したら、
   ⑦で見つけた「2モデルの最適な重み付き平均」を**超えると思う?**
2. メタモデルにも `P_lgbm`(単体では最も弱い)の列が入っている。これは足を引っ張るだろうか
3. スタッキングが重み付き平均より**有利になりうる**理由を、1つ挙げられる?"""))

cells.append(co(f'''# GOAL: スタッキングを動かし、重み付き平均と比べる

# STEP 1: 3モデルの OOF 確率を横に並べて特徴量行列にする
META_X = np.hstack([P_word, P_char, P_lgbm])
print("メタ特徴量の形:", META_X.shape, "= (行数, 3モデル × 6クラス)")

# STEP 2: メタモデルを、同じ CV で OOF 評価する
P_stack = cross_val_predict(LogisticRegression(max_iter=2000, C=1.0), META_X, y,
                            cv=CV, method="predict_proba")
print(f"\\nスタッキング         macro-F1 = {{macro_f1(P_stack):.4f}}")
print(f"重み付き平均(最良)  macro-F1 = {BEST_F:.4f}")
print(f"単体最良             macro-F1 = {F_CHAR:.4f}")

# STEP 3: メタモデルが何を重く見ているかを覗く
meta = LogisticRegression(max_iter=2000, C=1.0).fit(META_X, y)
blocks = {{"語": slice(0, 6), "文字": slice(6, 12), "LGBM": slice(12, 18)}}
print("\\n--- メタモデルの係数の大きさ(モデルごとの合計)---")
for name, sl in blocks.items():
    print(f"  {{name:5s}} {{float(np.abs(meta.coef_[:, sl]).sum()):.2f}}")
print("\\n→ 弱いモデルの列にも係数は付く。ゼロにするのではなく『小さく使う』のがメタモデルの答え。")'''))

cells.append(md("""## ⑥ 書いてみる: 「混ぜない」という判断を数字で下せるようにする

アンサンブルは万能ではない。**混ぜても得しない**と分かったら、素直に単体で出すべきだ。
その判断を関数にしておく。

次のセルで `should_blend(P_a, P_b, min_gain)` を書こう。

- `P_a` と `P_b` を **0.05 刻み**で混ぜて macro-F1 の最大値を探す(⑦ でやったことと同じ)
- その最大値が「**2つの単体のうち良い方**」を `min_gain` **より大きく**上回るなら `True`
- そうでなければ `False`
- 返り値は `(判定, 最良の重み, 最良のスコア, 単体最良のスコア)` の**4要素タプル**

**5〜8行**で書ける。⑦ で書いた探索をそのまま関数の中に入れ、最後に比較を足すだけだ。

> `min_gain` を置くのは、**誤差レベルの改善で複雑さを増やさない**ため。
> モデルを2本運用すると、学習も推論もデプロイも2倍になる。
> 0.0005 の改善のためにそれを払う価値があるか、は必ず問うべき問いだ。
>
> 実際に動かすと、**「語 + 文字」は True、「語 + LightGBM」は False** になるはずだ。
> 後者の改善はわずか 0.0006 で、閾値 0.001 に届かない。
> **閾値は君が決める**。0.0005 にすれば True になる。正解の数字があるわけではなく、
> 「2本運用する手間に見合う改善か」を自分で線引きすることが判断そのものだ。"""))

cells.append(co('''def should_blend(P_a, P_b, min_gain=0.001):
    """2モデルを混ぜる価値があるかを判定する。
    返り値: (判定, 最良の重み, 最良のスコア, 単体最良のスコア)"""
    # ここに書く(ヒント: ⑦ と同じ 0.05 刻みの探索をして最良を求め、
    #           max(macro_f1(P_a), macro_f1(P_b)) と min_gain で比較する)
    return None


r1 = call_safely(should_blend, P_word, P_char)
r2 = call_safely(should_blend, P_word, P_lgbm)
print("語 + 文字   :", r1)
print("語 + LightGBM:", r2)'''))

# 期待値: should_blend の結果
def _should(Pa, Pb, min_gain=0.001):
    g = np.arange(0.0, 1.0001, 0.05)
    sc = [(round(float(w), 2), macro_f1(w * Pa + (1 - w) * Pb)) for w in g]
    bw, bf = max(sc, key=lambda t: t[1])
    single = max(macro_f1(Pa), macro_f1(Pb))
    return (bf - single > min_gain), bw, round(bf, 6), round(single, 6)

R1 = _should(P_word, P_char)
R2 = _should(P_word, P_lgbm)
print("should_blend(word,char) =", R1)
print("should_blend(word,lgbm) =", R2)

cells.append(co(f'''# ===== チェックポイント B: 混ぜる価値の判定 =====
check("B-1 語+文字 の判定", None if not isinstance(r1, tuple) else float(bool(r1[0])), {float(R1[0])},
      hint="min_gain=0.001 より大きく上回るか。境界は > であって >= ではない。")

check("B-2 語+文字 の最良の重み", None if not isinstance(r1, tuple) else r1[1], {R1[1]},
      hint="w は P_a(第1引数)側の重み。")

check("B-3 語+文字 の最良スコア", None if not isinstance(r1, tuple) else r1[2], {R1[2]},
      hint="round は不要(check が誤差を吸収する)。")

check("B-4 語+LightGBM の判定", None if not isinstance(r2, tuple) else float(bool(r2[0])), {float(R2[0])},
      hint="改善が min_gain を超えるかで決まる。この組み合わせの改善は約 0.0006 で閾値 0.001 に届かない。")

check("B-5 返り値の要素数", None if not isinstance(r1, tuple) else len(r1), 4,
      hint="(判定, 最良の重み, 最良のスコア, 単体最良のスコア) の4要素。")

print("\\n(5つとも [OK] になったら次の概念へ)")'''))

# ============================================================ 概念3
cells.append(md("""## ① なぜ: 学習した日と、推論する日は違う

コンペでは notebook 1本で完結する。だが実務は違う。
**モデルを学習するのは月に数回、推論は毎日**だ。学習した本人がその場で推論するとは限らない。

だから「学習」と「推論」は**別のプログラム**に分けて、間を **artifact**(成果物のファイル)で繋ぐ。

```
[学習スクリプト] --(モデル + 前処理を artifact に保存)--> [推論スクリプト]
   月に数回・GPU                                          毎日・CPU
```

この分離ができていないと、「推論するために学習コードを毎回動かす」羽目になる。
学習は数時間かかるので、それは運用として成り立たない。"""))

cells.append(md("""## ② 解説: artifact に何を入れるか、そして再現性

**前処理も一緒に保存する**のが要点。`TfidfVectorizer` は学習時に語彙表を作る。
推論時に別の語彙表を作ってしまったら、列の意味が変わって予測は無意味になる。
だから「語彙表を持った vectorizer」と「モデル」を**セット**で保存する。

| 保存するもの | 忘れるとどうなるか |
|---|---|
| 学習済みモデル | そもそも推論できない |
| 前処理(vectorizer / scaler / encoder) | **列の意味が変わり、予測が壊れる** |
| クラスの並び | 予測が別のラベルとして解釈される |
| ライブラリのバージョン | 別バージョンで読めない・挙動が変わる |

道具は `joblib`。C# の `BinaryFormatter` によるオブジェクト永続化に近いが、
sklearn のオブジェクトを丸ごと保存できる点が違う。

```python
import joblib
joblib.dump({"model": model, "vectorizer": vec}, "artifact.joblib")
loaded = joblib.load("artifact.joblib")
```

**再現性**も同じ話だ。同じデータ・同じコード・同じ seed なら同じ結果になること。
`random_state` を固定していないモデルは、学習し直すたびに違う予測を出す。
「昨日と結果が違う」を追いかけるのは実務で最も消耗するデバッグなので、最初に潰しておく。

**シード平均**はその逆用で、seed を変えたモデルを複数作って平均する。
1本ずつのブレは打ち消し合い、平均は安定する。ただし**学習時間が本数分かかる**。"""))

cells.append(co('''# GOAL: artifact に保存 → 読み込み → 同じ予測が出ることを確認する

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer

# STEP 1: 学習側 —— 前処理とモデルをセットで作る
vec_train = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True)
X_train = vec_train.fit_transform(DOCS)
model_train = LogisticRegression(max_iter=2000, C=4.0, random_state=0).fit(X_train, y)
pred_before = model_train.predict(X_train[:200])

# STEP 2: artifact に保存する。前処理・モデル・クラスの並びを一緒に入れる
artifact_path = OUT / "text_classifier.joblib"
joblib.dump({"vectorizer": vec_train, "model": model_train, "classes": CLASSES,
             "sklearn_version": __import__("sklearn").__version__}, artifact_path)
print("保存:", artifact_path, f"({artifact_path.stat().st_size / 1024:.0f} KB)")

# STEP 3: 推論側 —— 学習コードを一切知らない状態で読み込んで使う
art = joblib.load(artifact_path)
X_infer = art["vectorizer"].transform(DOCS[:200])   # fit ではなく transform
pred_after = art["model"].predict(X_infer)

print("\\n読み込んだ artifact のキー:", sorted(art))
print("学習時の sklearn:", art["sklearn_version"])
print("予測が一致した件数:", int((pred_before == pred_after).sum()), "/ 200")

# STEP 4: 前処理を保存し忘れたらどうなるか(よくある事故の再現)
vec_wrong = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, sublinear_tf=True)
X_wrong = vec_wrong.fit_transform(DOCS[:200])       # 推論側で fit し直してしまった
try:
    pred_wrong = art["model"].predict(X_wrong)
    print("\\n前処理を作り直した場合の一致件数:", int((pred_before == pred_wrong).sum()), "/ 200")
except Exception as e:
    print(f"\\n前処理を作り直すと {type(e).__name__}: 列数が学習時と合わない")'''))

cells.append(md("""## ④ 予測: シードを変えると何が動く?

次のセルで、`random_state` だけを変えた LightGBM を3本学習して平均する。実行前に予測してほしい。

1. `random_state` を変えると、**同じデータ・同じパラメータ**でも予測は変わるだろうか
2. 変わるとしたら、何がその違いを生んでいる?(ヒント: `subsample` と `colsample_bytree`)
3. 3本の平均は、1本の予測より**安定する**と思う? スコアは上がると思う?
4. 実務でシード平均を採用するとき、払うコストは何だろうか"""))

cells.append(co('''# GOAL: シード平均が効くのはどういうときかを見る

from sklearn.model_selection import cross_val_predict

# STEP 1: ランダム性のあるパラメータで、seed だけ変えた3本を作る
def lgbm_seed(seed):
    return lgb.LGBMClassifier(n_estimators=100, learning_rate=0.12, subsample=0.8,
                              subsample_freq=1, colsample_bytree=0.8,
                              random_state=seed, verbose=-1)

seed_preds = [cross_val_predict(lgbm_seed(s), Xs, y, cv=CV, method="predict_proba") for s in (0, 1, 2)]
for s, P in zip((0, 1, 2), seed_preds):
    print(f"  seed={s}  macro-F1 = {macro_f1(P):.4f}")

P_seedavg = np.mean(seed_preds, axis=0)
print(f"\\n  3本の平均 macro-F1 = {macro_f1(P_seedavg):.4f}")
print(f"  単体の平均         = {np.mean([macro_f1(P) for P in seed_preds]):.4f}")

# STEP 2: ランダム性を切ると seed は効かなくなる
def lgbm_norand(seed):
    return lgb.LGBMClassifier(n_estimators=100, learning_rate=0.12, random_state=seed, verbose=-1)

a = cross_val_predict(lgbm_norand(0), Xs, y, cv=CV, method="predict_proba")
b = cross_val_predict(lgbm_norand(1), Xs, y, cv=CV, method="predict_proba")
print(f"\\nsubsample を切ると seed=0 と seed=1 の予測は完全一致するか: {np.allclose(a, b)}")
print("→ シード平均が効くのは、モデルにランダム性があるときだけ。")
print("  subsample / colsample_bytree を設定していないと、seed を変えても同じ木ができる。")'''))

cells.append(md("""## ⑥ 書いてみる: artifact を検証する関数

保存した artifact が「本当に使えるか」は、**保存直後に読み直して確かめる**のが確実だ。
これを関数にしておけば、学習パイプラインの最後に必ず回せる。

次のセルで `verify_artifact(path, docs, expected_pred)` を書こう。

- `path` から `joblib.load` で読み込む
- `art["vectorizer"].transform(docs)` で特徴量を作る(**`fit_transform` ではない**)
- `art["model"].predict(...)` で予測する
- `expected_pred` と一致した件数を数える
- 返り値は `{"n_total": 件数, "n_match": 一致件数, "ok": 全件一致か}` の **dict**

**5〜7行**で書ける。`ok` は Python の `bool` にすること(`np.bool_` ではなく)。

> なぜ「一致件数」まで返すのか。全件一致しなかったとき、
> **1件だけずれた**のか**全件ずれた**のかで原因がまったく違うからだ。
> 前者は境界値やタイブレーク、後者は前処理の取り違えを疑う。"""))

cells.append(co('''def verify_artifact(path, docs, expected_pred):
    """artifact を読み直して、期待した予測が再現できるかを検証する。"""
    # ここに書く(ヒント: joblib.load(path) → art["vectorizer"].transform(docs)
    #           → art["model"].predict(...) → expected_pred と比較)
    return None


report = call_safely(verify_artifact, artifact_path, DOCS[:200], pred_before)
print("検証結果:", report)'''))

cells.append(co('''# ===== チェックポイント C: artifact の検証 =====
_ok = isinstance(report, dict)
check("C-1 返り値が dict か", 1.0 if _ok else 0.0, 1.0,
      hint='{"n_total": ..., "n_match": ..., "ok": ...} の3キーを持つ dict を返す。')

check("C-2 n_total", report.get("n_total") if _ok else None, 200,
      hint="docs の件数。len(docs) でよい。")

check("C-3 n_match", report.get("n_match") if _ok else None, 200,
      hint="200 未満なら transform ではなく fit_transform を使っている可能性が高い。")

check("C-4 ok が True か", (1.0 if report.get("ok") else 0.0) if _ok else None, 1.0,
      hint="n_match == n_total を bool() で包む。")

check("C-5 キーが3つそろっているか", len(report) if _ok else 0, 3,
      hint='キーは "n_total" / "n_match" / "ok" の3つ。')

print("\\n(5つとも [OK] になったら次の概念へ)")'''))

# ============================================================ 概念4
cells.append(md(f"""## ① なぜ: 「精度が出ました」の次に必ず聞かれること

モデルができたら、次に上司や顧客から来る質問はこれだ。

> **「で、それいくらかかるの?」**

ここで答えられないと、どれだけ精度が良くても本番には出せない。
逆に、**数字で答えられる**なら予算は通る。この節はそのための計算だ。

学習者の想定構成は「**開発は手元の PC、学習はクラウド GPU を時間借り、推論は CPU で常時**」。
この非対称性が効いてくる — **学習は月に数回・数時間、推論は毎日・大量**。"""))

cells.append(md(f"""## ② 解説: 損益分岐を式にする

比較するのは2つの選択肢だ。

**A. LLM API に投げる**(従量課金)
```
月額 = 件数 × (入力トークン × 入力単価 + 出力トークン × 出力単価)
```
件数に**比例**して増える。初期費用ゼロで始められるのが強み。

**B. 自前でモデルを持つ**(固定費)
```
月額 = GPU時間単価 × 学習時間 × 月の再学習回数  +  CPU時間単価 × 稼働時間
```
件数に**ほぼ依存しない**。スループットが足りている限り、10万件でも100万件でも同じ。

この2本の直線が交わる点が**損益分岐**だ。それより件数が多ければ自前が有利になる。

| 項目 | このレッスンで使う値 |
|---|---|
| API 入力トークン / 件 | {API_IN} |
| API 出力トークン / 件 | {API_OUT}(カテゴリ名を1つ返すだけ) |
| API 入力単価 | ${API_IN_USD} / 100万トークン |
| API 出力単価 | ${API_OUT_USD} / 100万トークン |
| GPU 時間単価 | ${GPU_USD_H} / 時間 |
| 1回の学習時間 | {GPU_HOURS} 時間 |
| 月の再学習回数 | {RETRAIN} 回 |
| CPU 時間単価 | ${CPU_USD_H} / 時間 |
| CPU 稼働時間 | {CPU_HOURS} 時間(常時稼働) |

**分類は API に有利な条件だ**(出力が短いので出力課金がほぼ効かない)。
それでも件数が増えれば逆転する。**要約のような生成タスクだと出力トークンが数百になり、
API 側のコストが一桁変わる** — Day11 でその違いを扱う。

> **見落としやすいコスト**: 自前には「作る人の時間」と「壊れたときに直す人の時間」が乗る。
> 上の式は**運用費だけ**の比較で、そこは入っていない。件数が損益分岐の近くなら、
> 運用の手間を考えて API を選ぶ判断も十分に合理的だ。"""))

cells.append(co(f'''# GOAL: コストを式にして、件数を変えたときの逆転を見る

API_IN, API_OUT = {API_IN}, {API_OUT}
API_IN_USD, API_OUT_USD = {API_IN_USD}, {API_OUT_USD}
GPU_USD_H, GPU_HOURS, RETRAIN = {GPU_USD_H}, {GPU_HOURS}, {RETRAIN}
CPU_USD_H, CPU_HOURS = {CPU_USD_H}, {CPU_HOURS}

# STEP 1: 1件あたりの API 費用
api_per_item = API_IN / 1e6 * API_IN_USD + API_OUT / 1e6 * API_OUT_USD
print(f"API 1件あたり: ${{api_per_item:.8f}}")

# STEP 2: 自前の月額(件数に依存しない固定費)
self_monthly = GPU_USD_H * GPU_HOURS * RETRAIN + CPU_USD_H * CPU_HOURS
print(f"自前の月額   : ${{self_monthly:.2f}}"
      f"  (学習 ${{GPU_USD_H * GPU_HOURS * RETRAIN:.2f}} + 推論 ${{CPU_USD_H * CPU_HOURS:.2f}})")

# STEP 3: 件数を変えて並べる
print(f"\\n{{'月間件数':>12s}} {{'API':>10s}} {{'自前':>10s}} {{'安い方':>8s}}")
print("-" * 44)
for n in (10_000, 100_000, 1_000_000, 3_000_000, 10_000_000):
    a = n * api_per_item
    print(f"{{n:>12,}} {{a:>9.2f}}$ {{self_monthly:>9.2f}}$ {{'API' if a < self_monthly else '自前':>8s}}")

print(f"\\n→ 推論は常時稼働の CPU 代({{CPU_USD_H * CPU_HOURS:.0f}}$)が固定費の大半を占める。")
print("  学習は月2回・3時間なので、意外と安い。")'''))

cells.append(md(f"""## ④ 予測: 損益分岐はどのあたり?

③ の表を見てから答えてほしい。

1. 損益分岐は 100万件と 1000万件の**どちらに近い**? 表から読み取れる?
2. **CPU を常時稼働ではなく、日次バッチで1日1時間だけ**動かす構成にしたら、
   損益分岐はどちらに動く?(自前が有利になる? 不利になる?)
3. 再学習を月2回から月1回に減らしたら、損益分岐はどのくらい動くだろうか
4. **1件あたりの入力トークンが 500 から 2000 に増えたら**(説明文が長い商品)、
   どちらの選択肢がより痛むだろうか"""))

cells.append(co(f'''# GOAL: 条件を変えて、損益分岐がどう動くかを見る

def break_even(api_in=API_IN, api_out=API_OUT, gpu_h=GPU_HOURS, retrain=RETRAIN, cpu_h=CPU_HOURS):
    per_item = api_in / 1e6 * API_IN_USD + api_out / 1e6 * API_OUT_USD
    monthly = GPU_USD_H * gpu_h * retrain + CPU_USD_H * cpu_h
    return int(np.ceil(monthly / per_item)), monthly, per_item


base, m, p = break_even()
print(f"{{'条件':<34s}} {{'損益分岐(件/月)':>16s}}")
print("-" * 52)
print(f"{{'基準':<34s}} {{base:>16,}}")
for label, kw in (
    ("CPUを日次1時間バッチに (720→30h)", dict(cpu_h=30.0)),
    ("再学習を月1回に", dict(retrain=1)),
    ("入力トークンが4倍 (500→2000)", dict(api_in=2000)),
    ("出力が長い生成タスク (5→400)", dict(api_out=400)),
):
    n, _, _ = break_even(**kw)
    print(f"{{label:<34s}} {{n:>16,}}")

print("\\n→ 自前の固定費を下げる(バッチ化)と損益分岐は大きく下がり、自前が有利になる。")
print("  1件あたりのトークンが増えると API 側が重くなり、これも自前有利に働く。")
print("  『どちらが安いか』は件数だけでなく、稼働のさせ方とタスクの形で変わる。")'''))

cells.append(md(f"""## ⑥ 書いてみる: 上司に出す判断材料を作る

最後に、**そのまま報告に使える関数**を書こう。

次のセルで `cost_decision(monthly_items, api_in_tokens, api_out_tokens)` を書く。

返すのは次の5キーを持つ **dict**:

| キー | 中身 |
|---|---|
| `"api_monthly"` | API の月額(USD、`float`) |
| `"self_monthly"` | 自前の月額(USD、`float`)。**件数に依存しない** |
| `"break_even_items"` | 損益分岐の件数(`int`。`np.ceil` して `int()`) |
| `"cheaper"` | `"api"` か `"self"`(安い方の文字列) |
| `"saving_monthly"` | 安い方を選んだときの月あたり節約額(USD、`float`、**必ず0以上**) |

固定のパラメータ(単価・GPU時間・CPU時間)は上のセルで定義済みの定数を使ってよい。

**7〜10行**で書ける。`abs()` を使うと `saving_monthly` を素直に書ける。

> この関数がそのまま「見積書」になる。**件数を変えて何度も呼べる形**にしておくのが要点で、
> 「じゃあ倍になったら?」と聞かれたその場で答えられる。"""))

cells.append(co('''def cost_decision(monthly_items, api_in_tokens=API_IN, api_out_tokens=API_OUT):
    """API と自前のコストを比較し、判断材料を dict で返す。"""
    # ここに書く(ヒント: 1件あたりAPI費 = in/1e6*API_IN_USD + out/1e6*API_OUT_USD
    #           自前月額 = GPU_USD_H*GPU_HOURS*RETRAIN + CPU_USD_H*CPU_HOURS)
    return None


for n in (10_000, 3_000_000):
    d = call_safely(cost_decision, n)
    print(f"月間 {n:,} 件 →", d)'''))

_api_per = API_PER_ITEM
_self = SELF_MONTHLY
d1_api = 10_000 * _api_per
d2_api = 3_000_000 * _api_per
cells.append(co(f'''# ===== チェックポイント D: コスト判断 =====
_d1 = call_safely(cost_decision, 10_000)
_d2 = call_safely(cost_decision, 3_000_000)
_ok1, _ok2 = isinstance(_d1, dict), isinstance(_d2, dict)

check("D-1 自前の月額(件数に依存しない)", _d1.get("self_monthly") if _ok1 else None, {SELF_MONTHLY_R},
      hint="GPU_USD_H*GPU_HOURS*RETRAIN + CPU_USD_H*CPU_HOURS。件数を掛けない。")

check("D-2 1万件のときの API 月額", _d1.get("api_monthly") if _ok1 else None, {round(d1_api, 6)},
      hint="件数 × (入力トークン/1e6*単価 + 出力トークン/1e6*単価)。")

check("D-3 損益分岐の件数", _d1.get("break_even_items") if _ok1 else None, {BREAK_EVEN},
      hint="自前月額 ÷ API1件あたり費用 を np.ceil して int()。")

check("D-4 1万件ではどちらが安いか", 1.0 if (_ok1 and _d1.get("cheaper") == "api") else 0.0, 1.0,
      hint="損益分岐は 27,429 件。1万件はそれより少ないので API が安い。")

check("D-5 300万件ではどちらが安いか", 1.0 if (_ok2 and _d2.get("cheaper") == "self") else 0.0, 1.0,
      hint="損益分岐を超えたら自前。")

check("D-6 300万件のときの節約額", _d2.get("saving_monthly") if _ok2 else None, {round(abs(d2_api - _self), 6)},
      hint="abs(api_monthly - self_monthly)。必ず0以上になる。")

check("D-7 キーが5つそろっているか", len(_d1) if _ok1 else 0, 5,
      hint='"api_monthly" / "self_monthly" / "break_even_items" / "cheaper" / "saving_monthly"。')

print("\\n(7つとも [OK] になったら答え合わせへ)")'''))

# ---------------- 締め: Day1-4 の教訓 + 振り返り
cells.append(md(f"""## 補講: 「混ぜても効かなかった」という結果の読み方

Day1〜4 で育てた**価格予測のコンペ**でも同じことをやってみた結果を載せておく。
このコースの作成時に実測したものだ。

| モデル | OOF | 本番LB |
|---|---|---|
| Ridge(前処理込み) | **0.6378** | **0.6092** |
| LightGBM | 0.7249 | 0.6835 |
| LightGBM(時間トレンドを除去してから) | 0.7225 | 0.6771 |
| **OOFで最適化したブレンド重み** | **Ridge 1.00 / LightGBM 0.00** | — |

**混ぜる価値がゼロだった。** 重み探索は LightGBM に 0.00 を割り当てた。

これは失敗ではない。**仕組みが正しく働いた**結果だ。あのデータは価格が
「カテゴリ + 状態 + サイト + 経過日数」の**足し算**で決まる構造をしていて(対数スケールで)、
one-hot + 線形モデルがその構造とぴったり噛み合う。木はそれを階段関数で近似するしかなく、
構造的に勝てない。**だから混ぜても得られるものが無い。**

ここから持ち帰ってほしいのは2つ。

1. **アンサンブルは万能ではない。** データの構造と噛み合ったモデルが1本あるなら、それが答え。
2. **「効かない」を OOF で確認して撤退できることが実力。** 効くと信じて2本運用を続けるより、
   数字を見て1本に絞る方がずっと良い。運用は単純な方が強い。"""))

cells.append(md("""## 振り返り

以下に1〜2文で書いてみよう(チューターがこの記述を学習ノートとスキル判定に使う)。

- **今日学んだことを自分の言葉で**:
- **難しかったこと(あれば)**:
- **10日間を通して、いちばん効いた考え方は何だった?**:"""))

cells.append(md("""## まとめ

今日できるようになったこと。

- **OOF ブレンド** — 重みは必ず OOF で決める。学習データでの予測で決めてはいけない
- **相関を見る** — 予測が似すぎたモデルを混ぜても意味がない。誤り方が違って初めて効く
- **素朴な平均の罠** — 弱いモデルを等分で混ぜると足を引っ張る。重みは探索して決める
- **スタッキング** — 重みを人が決める代わりにメタモデルに学習させる。クラスごとの使い分けまで拾える
- **撤退の判断** — 改善が誤差レベルなら混ぜない。運用は単純な方が強い
- **artifact による分離** — 前処理とモデルをセットで保存し、読み直して再現を確認する
- **シード平均** — モデルにランダム性があるときだけ効く。学習時間は本数分かかる
- **コスト設計** — API 従量課金と自前の固定費の損益分岐を、件数を変えて即答できる形にする

### この先どこで使うか

- **Day11(休暇明け)** — 要約は出力トークンが数百になるので、今日のコスト式で API 側が一桁重くなる。
  同じ関数を使い回して、抽出型 / 自前小型モデル / LLM API の三択を数字で決める
- **実務** — artifact の分離と再現性の確認は、モデルを本番に出す日の最初の関門になる

**演習 `ex01`〜`ex04` へ進もう。lesson を見ながらで OK。**"""))

nb = nbf.v4.new_notebook()
nb.cells = cells
nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
for c in nb.cells:
    if c.cell_type == "code":
        c.outputs = []
        c.execution_count = None

UNIT.mkdir(parents=True, exist_ok=True)
nbf.write(nb, UNIT / "lesson.ipynb")
print(f"\n書き出し: {UNIT / 'lesson.ipynb'}  ({len(cells)} セル)")
print("『ここに書く』セル:", [i for i, c in enumerate(nb.cells)
                              if c.cell_type == "code" and "ここに書く" in c.source])
