"""unit12 の lesson.ipynb を生成する。

期待値の計算と notebook 生成を同じスクリプトで行う(unit05 で成功した方式)。
実行: python gen_unit12.py [--solved]
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import nbformat as nbf
import numpy as np
import pandas as pd

ROOT = Path("/home/user/coding_study")
UNIT = ROOT / "courses/kaggle-sprint/unit12-lightweight-model-ladder"
D5 = ROOT / "courses/kaggle-sprint/unit05-text-classical-nlp/data"
D6 = ROOT / "courses/kaggle-sprint/unit06-entity-resolution/data"
D12 = UNIT / "data"
SOLVED = "--solved" in sys.argv

# ============================================================
# 1. 期待値をここで実際に計算する
# ============================================================
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction import DictVectorizer
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

TOK = Tokenizer()
SPACE = re.compile(r"\s+")


def normalize(s):
    s = unicodedata.normalize("NFKC", str(s))
    s = re.sub(r"<[^>]+>|&[a-z]+;", " ", s)
    s = re.sub(r"[【】★※◆《》!!✨🔥💯⭐🎁]+", " ", s)
    s = re.sub(r"[¥￥]?[\d,]+\s*(円|yen)?", " <num> ", s)
    return SPACE.sub(" ", s).strip().lower()


def wakati(s):
    return " ".join(t.surface for t in TOK.tokenize(s))


print("[1/4] 段2: 軽量分類の期待値を計算")
t5 = pd.read_csv(D5 / "train.csv")
docs = [wakati(normalize(a + " " + b)) for a, b in zip(t5["title"], t5["description"])]
y5 = t5["category"].to_numpy()
Xa, Xb, ya, yb = train_test_split(docs, y5, test_size=0.2, random_state=0, stratify=y5)
HV = dict(n_features=2 ** 18, ngram_range=(1, 2), alternate_sign=False, norm="l2")
hv = HashingVectorizer(**HV)
clf2 = SGDClassifier(loss="log_loss", alpha=1e-6, max_iter=30, random_state=0).fit(hv.transform(Xa), ya)
p2 = clf2.predict(hv.transform(Xb))
ACC2, F12 = round(float(accuracy_score(yb, p2)), 4), round(float(f1_score(yb, p2, average="macro")), 4)
N_FEAT = int(hv.transform(Xb[:1]).shape[1])
print(f"   acc={ACC2} macroF1={F12}")

print("[2/4] 段3/4: 二段構えの期待値を計算")
rec = pd.read_csv(D6 / "records.csv").fillna({"brand": ""})
voc = pd.read_csv(D6 / "vocab.csv")
nz = lambda s: unicodedata.normalize("NFKC", str(s)).replace(" ", "").replace("-", "").lower()
rec["t"] = rec["title"].map(nz)
rng = np.random.default_rng(0)
DIM = 48
cen = {g: rng.normal(0, 1, DIM) for g in voc["sense_group"].unique()}
tvec = {r.token: cen[r.sense_group] + rng.normal(0, 0.15, DIM) for r in voc.itertuples()}


def embed(t):
    hits = [v for w, v in tvec.items() if nz(w) in t]
    if not hits:
        return np.zeros(DIM)
    x = np.mean(hits, axis=0)
    n = np.linalg.norm(x)
    return x / n if n > 0 else x


E = np.stack([embed(t) for t in rec["t"]])
S = E @ E.T
np.fill_diagonal(S, -9.0)
pk = rec["product_key"].to_numpy()
N6 = len(rec)
ALL_PAIRS = N6 * (N6 - 1) // 2
TOT_POS = int(sum(v * (v - 1) // 2 for v in pd.Series(pk).value_counts()))
K = 10
cand = np.argsort(-S, axis=1)[:, :K]
pairs = sorted({(min(i, j), max(i, j)) for i, row in enumerate(cand) for j in row})
lab6 = np.array([pk[a] == pk[b] for a, b in pairs]).astype(int)
N_CAND, N_CAND_POS = len(pairs), int(lab6.sum())
RECALL_CAND = round(N_CAND_POS / TOT_POS, 4)
print(f"   候補 {N_CAND} / 正例 {N_CAND_POS} / 再現率 {RECALL_CAND}")

print("[3/4] 段0/5: 規則 と 系列ラベリング の期待値を計算")
tr12 = pd.read_csv(D12 / "ner_train.csv").fillna({"brand": ""})
ans12 = pd.read_csv(ROOT / "courses/kaggle-sprint/.solutions/unit12-lightweight-model-ladder/_answer.csv").fillna({"brand": ""})
te12 = pd.read_csv(D12 / "ner_test.csv").merge(ans12, on="record_id")
KNOWN = sorted(set(tr12["brand"]) - {""})
PAT = re.compile(r"[A-Za-z][0-9]{3}-?[0-9]{2}")


def rule_model(t):
    n = unicodedata.normalize("NFKC", t)
    m = PAT.search(n)
    if not m:
        return ""
    s = m.group(0)
    return s if "-" in s else s[:4] + "-" + s[4:]


def rule_brand(t):
    n = unicodedata.normalize("NFKC", t)
    return next((b for b in KNOWN if b in n), "")


rm = [rule_model(t) for t in te12["title"]]
rb = [rule_brand(t) for t in te12["title"]]
newfmt = te12["model_code"].str.match(r"^[0-9]{4}-[A-Z]{2}$").to_numpy()
unseen = (~te12["brand"].isin(KNOWN + [""])).to_numpy()
eq = lambda a, b: np.array([x == y for x, y in zip(a, b)])
RM_ALL = round(float(eq(rm, te12["model_code"]).mean()), 4)
RM_KNOWN = round(float(eq(rm, te12["model_code"])[~newfmt].mean()), 4)
RB_KNOWN = round(float(eq(rb, te12["brand"])[~unseen].mean()), 4)


def cclass(c):
    if c.isdigit() or "０" <= c <= "９":
        return "D"
    if c.isascii() and c.isalpha():
        return "A"
    if "Ａ" <= c <= "Ｚ" or "ａ" <= c <= "ｚ":
        return "Af"
    if "ァ" <= c <= "ヶ" or "ｦ" <= c <= "ﾟ":
        return "K"
    if "一" <= c <= "龥":
        return "H"
    return "S"


def cfeat(t, i):
    g = lambda k: t[k] if 0 <= k < len(t) else "<>"
    return {f"c0={g(i)}": 1, f"c-1={g(i-1)}": 1, f"c+1={g(i+1)}": 1,
            f"k0={cclass(g(i))}": 1, f"k-1={cclass(g(i-1))}": 1, f"k+1={cclass(g(i+1))}": 1,
            f"k+2={cclass(g(i+2))}": 1, f"k-2={cclass(g(i-2))}": 1,
            f"K3={cclass(g(i-1))}{cclass(g(i))}{cclass(g(i+1))}": 1,
            f"K5={cclass(g(i-2))}{cclass(g(i-1))}{cclass(g(i))}{cclass(g(i+1))}{cclass(g(i+2))}": 1,
            f"bos={i==0}": 1, f"eos={i==len(t)-1}": 1}


XX, YY = [], []
for t, b in zip(tr12["title"], tr12["bio"]):
    tg = b.split()
    for i in range(len(t)):
        XX.append(cfeat(t, i))
        YY.append(tg[i])
dv = DictVectorizer()
clf5 = LogisticRegression(max_iter=400, C=4.0, n_jobs=-1).fit(dv.fit_transform(XX), YY)


def tag_decode(t):
    P = list(clf5.predict(dv.transform([cfeat(t, i) for i in range(len(t))])))
    out, cur, s = {}, None, 0
    for i, p in enumerate(P + ["O"]):
        if cur and (i == len(P) or p != f"I-{cur}"):
            out.setdefault(cur, t[s:i])
            cur = None
        if i < len(P) and p.startswith("B-"):
            cur, s = p[2:], i
    return out


def norm_model(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)
    if "-" in s:
        return s
    if re.match(r"^[A-Z][0-9]{5}$", s):
        return s[:4] + "-" + s[4:]
    if re.match(r"^[A-Z]{2}[0-9]{4}$", s):
        return s[:2] + "-" + s[2:]
    if re.match(r"^[0-9]{4}[A-Z]{2}$", s):
        return s[:4] + "-" + s[4:]
    return s


dec = [tag_decode(t) for t in te12["title"]]
nm = [norm_model(d.get("MODEL", "")) for d in dec]
nb_ = [d.get("BRAND", "") for d in dec]
NM_KNOWN = round(float(eq(nm, te12["model_code"])[~newfmt].mean()), 4)
NB_KNOWN = round(float(eq(nb_, te12["brand"])[~unseen].mean()), 4)
NM_NEW = round(float(eq(nm, te12["model_code"])[newfmt].mean()), 4)
print(f"   規則 型番既知 {RM_KNOWN} / タガー 型番既知 {NM_KNOWN}")
print(f"   規則 ブランド既知 {RB_KNOWN} / タガー ブランド既知 {NB_KNOWN} / 新書式 {NM_NEW}")

print("[4/4] notebook を組み立て")

# ============================================================
# 2. notebook を組み立てる
# ============================================================
CHECK = '''def check(name, actual, expected, hint=""):
    import numpy as _np
    try:
        ok = actual is not None and bool(_np.all(_np.isclose(
            _np.asarray(actual, dtype=float), _np.asarray(expected, dtype=float))))
    except (TypeError, ValueError):
        ok = actual == expected
    if ok:
        print(f"[OK] {name}: 正解!")
    else:
        print(f"[NG] {name}: 期待値 {expected!r} / 実際 {actual!r}")
        if hint:
            print(f"     ヒント: {hint}")
    return ok


def call_safely(fn, *args, **kwargs):
    """未記入の関数を呼んでも notebook を止めない。"""
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        print(f"     ({getattr(fn, '__name__', 'fn')} の中で例外 → {type(e).__name__}: {e})")
        return None
'''

md, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell
cells = []

cells.append(md("""# unit12 レッスン: 軽量モデルの段階表 — CPUだけで安く済ませる

**題材** — 収集した商品データに対する「分類」「名寄せ」「抽出」を、**CPU だけで回る道具**で解く。
本番の推論サーバーは CPU のみ(GCP T2D 相当)で、生成 LLM は載せられない。

## このレッスンを終えると作れるようになるもの

1. ハッシュ n-gram + 線形分類器を組み、**前処理と推論のどちらが律速か**を測って答えられる
2. bi-encoder とクロスエンコーダで **コストの「形」がどう違うか** を説明し、二段構えを組める
3. 規則(正規表現・辞書)と学習モデルを**同じ基準で比較**し、対象の性質から使い分けを判断できる
4. 件数と精度要求から「**どの段で止めるか**」をコスト計算で答えられる

所要の目安: **90〜120分**。このあと演習 `ex01`〜`ex04` が続く。

> **速度の数値について** — このノートブックが表示する「件/秒」は**君のマシンの値**だ。
> 私の計測環境とは違う数字が出る。それでいい。**チェックポイントは速度を見ない**(精度と件数だけを見る)。
> 実務でも「自分の環境で測ってから本番インスタンスに換算する」が正しい順序で、
> 他人のベンチマークを鵜呑みにしてはいけない。この手順自体がこのレッスンの成果物だ。"""))

cells.append(code(f'''import re
import time
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
from janome.tokenizer import Tokenizer
from sklearn.feature_extraction import DictVectorizer
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

# --- データの場所。unit12 から開いてもリポジトリ直下から開いても動く ---
HERE = Path("data")
if not (HERE / "ner_train.csv").exists():
    HERE = Path("courses/kaggle-sprint/unit12-lightweight-model-ladder/data")
COURSE = HERE.resolve().parents[1]
D5 = COURSE / "unit05-text-classical-nlp" / "data"
D6 = COURSE / "unit06-entity-resolution" / "data"
assert (HERE / "ner_train.csv").exists(), f"データが見つかりません: {{HERE.resolve()}}"
print("unit12 データ:", HERE.resolve())
print("流用するデータ:", D5.name, "/", D6.name)

TOKENIZER = Tokenizer()      # 生成が重いので1回だけ作って使い回す
SPACE_RE = re.compile(r"\\s+")

{CHECK}
print("\\nセットアップ完了。ヘルパー: check / call_safely")'''))

# ---------------- 概念1 ----------------
cells.append(md("""## ① なぜ: 1件あたり 0.1 ミリ秒と 10 ミリ秒は、インスタンス台数の差になる

日次で数万〜数十万件を捌くとき、1件あたりの処理時間はそのまま費用になる。
だが実務でよくある失敗は、**遅い場所を測らずにモデルだけを速くしようとする**ことだ。

分類のパイプラインは「正規化 → 分かち書き → ベクトル化 → 推論」の4段。
このうちどこが一番重いか、君は予想できるだろうか。**測る前に手を入れてはいけない。**"""))

cells.append(md("""## ② 解説: 段階表と、コストの2つの軸

道具は軽い順に並べられる。**上の段ほど精度が出るとは限らない**が、上の段ほど確実に高い。

| 段 | 道具 | 何をするか |
|---|---|---|
| 0 | 辞書・正規表現 | 決まった書式の抽出、列挙できる集合の照合 |
| 1 | 形態素解析 | 分かち書き。全ての前段 |
| 2 | 軽量教師あり分類 | 大量テキストの分類 |
| 3 | 文埋め込み(bi-encoder) | 類似検索・名寄せの一次絞り |
| 4 | クロスエンコーダ | ペアの精密判定 |
| 5 | 系列ラベリング(NER) | 固有表現の抽出 |
| 6 | 小型生成モデル | 柔軟な変換 |

コストには**2つの軸**がある。混同すると判断を誤る。

| 軸 | 意味 | 効くのは |
|---|---|---|
| **1件あたりの時間** | スループット(件/秒) | 日次の総件数が大きいとき |
| **コストの形** | 件数に対して線形か、ペア数(n²)に比例するか | 対象が増えたときの伸び方 |

段3と段4の違いは前者ではなく**後者**だ。これは概念3で扱う。

### 段2で使う道具: ハッシュ n-gram + 線形分類器

`HashingVectorizer` は、単語 n-gram を**辞書を持たずに**固定長のベクトルへ変換する。
語彙表を作らないので、学習前に全データを1周する必要がなく、メモリも一定。

- `n_features` — 出力の次元。ハッシュの衝突と引き換えにメモリを固定する
- `alternate_sign=False` — 既定では衝突を打ち消すため符号を交互に付けるが、
  非負の特徴量が欲しい線形分類器ではこれを切る
- **`fit` が要らない**(状態を持たない)。`transform` だけで動く

これは fastText と同じ考え方だ(bag of n-grams → 線形分類器)。

> **fastText 本体について** — 段2の本命は本来 fastText だが、`fastText 0.9.3` は
> numpy 2.x で `predict()` が動かない(削除済みの `np.array(copy=False)` を使っているため)。
> 本番採用時は numpy を 1.x に固定するか C++ 実装を直接叩く必要がある。"""))

cells.append(code('''# GOAL: 分類パイプラインの各段を別々に測り、どこが律速かを突き止める

# STEP 1: Day5 の商品テキストを読む(4000件・6クラス)
t5 = pd.read_csv(D5 / "train.csv")
print("データ:", t5.shape, "| クラス:", t5["category"].nunique())

# STEP 2: 正規化(Day5 で作ったもの)
def normalize(s):
    s = unicodedata.normalize("NFKC", str(s))
    s = re.sub(r"<[^>]+>|&[a-z]+;", " ", s)
    s = re.sub(r"[【】★※◆《》!!✨🔥💯⭐🎁]+", " ", s)
    s = re.sub(r"[¥￥]?[\\d,]+\\s*(円|yen)?", " <num> ", s)
    return SPACE_RE.sub(" ", s).strip().lower()

def wakati(s):
    return " ".join(t.surface for t in TOKENIZER.tokenize(s))

# STEP 3: 正規化 + 分かち書きの時間を測る
raw = [a + " " + b for a, b in zip(t5["title"], t5["description"])]
t0 = time.time()
docs = [wakati(normalize(s)) for s in raw]
prep_sec = time.time() - t0
print(f"\\n前処理(正規化+分かち書き): {len(docs)/prep_sec:,.0f} 件/秒")

# STEP 4: ベクトル化 + 学習
y = t5["category"].to_numpy()
Xa, Xb, ya, yb = train_test_split(docs, y, test_size=0.2, random_state=0, stratify=y)
hv = HashingVectorizer(n_features=2**18, ngram_range=(1, 2), alternate_sign=False, norm="l2")
t0 = time.time()
clf = SGDClassifier(loss="log_loss", alpha=1e-6, max_iter=30, random_state=0).fit(hv.transform(Xa), ya)
fit_sec = time.time() - t0
print(f"学習: {fit_sec:.2f} 秒({len(Xa)} 件)")

# STEP 5: 推論だけの時間を測る(ベクトル化済みの行列に対して)
Bv = hv.transform(Xb)
t0 = time.time()
for _ in range(5):
    clf.predict(Bv)
infer_sec = (time.time() - t0) / 5
pred = clf.predict(Bv)
print(f"推論: {len(Xb)/infer_sec:,.0f} 件/秒")
print(f"\\n精度: accuracy {accuracy_score(yb, pred):.4f} / macro-F1 {f1_score(yb, pred, average='macro'):.4f}")'''))

cells.append(md("""## ④ 予測: どこが律速か

上の出力で「前処理」と「推論」の件/秒が出た。次のセルを実行する前に予測してほしい。

1. **前処理と推論、どちらが何倍重い?** 2倍? 10倍? 100倍?
2. 1万件を処理するとき、**合計時間のうち何割が前処理**になる?
3. この結果を見たあと、速度を上げたいなら**どこに手を入れる**?
   「もっと軽い分類器に替える」は正しい手だろうか?

> 実務でよくある失敗: モデルの推論時間ばかり気にして、その手前の前処理を測っていない。
> **測っていないものは最適化できない。**"""))

cells.append(code('''# GOAL: 1万件あたりの内訳を出し、律速がどちらかを確定させる
per_prep = 1 / (len(docs) / prep_sec)
per_infer = 1 / (len(Xb) / infer_sec)
ratio = per_prep / per_infer

print(f"1件あたり  前処理 {per_prep*1000:.4f} ミリ秒 / 推論 {per_infer*1000:.6f} ミリ秒")
print(f"→ 前処理は推論の {ratio:,.0f} 倍 重い\\n")

for n in (10_000, 100_000):
    p, i = n * per_prep, n * per_infer
    print(f"{n:>7,} 件: 前処理 {p:7.1f} 秒 + 推論 {i:6.2f} 秒 = 合計 {p+i:7.1f} 秒"
          f"(前処理が {p/(p+i)*100:.1f}%)")

print("\\n→ 分類器をどれだけ速くしても、全体はほとんど変わらない。")
print("  効くのは前処理側 — 分かち書き結果のキャッシュ、並列化、より軽い分割器への変更。")'''))

cells.append(md("""## ⑥ 書いてみる: スループットからコストを見積もる関数

測った件/秒を**お金**に変換できて初めて判断材料になる。

次のセルで `estimate_cost(n_items, items_per_sec, hourly_yen)` を書こう。

| 引数 | 意味 |
|---|---|
| `n_items` | 処理する件数 |
| `items_per_sec` | 実測したスループット(件/秒) |
| `hourly_yen` | インスタンスの時間単価(円) |

返り値は **`(所要秒数, 費用円)` のタプル**。費用は `所要秒数 / 3600 * hourly_yen`。
どちらも Python の `float` にすること。

3行で書ける。`n_items / items_per_sec` が所要秒数だ。"""))

cells.append(code('''def estimate_cost(n_items, items_per_sec, hourly_yen):
    """(所要秒数, 費用円) を返す。"""
    # ここに書く(ヒント: 秒数 = 件数 / スループット。費用 = 秒数 / 3600 * 時間単価)
    return None
''' if not SOLVED else '''def estimate_cost(n_items, items_per_sec, hourly_yen):
    """(所要秒数, 費用円) を返す。"""
    sec = n_items / items_per_sec
    return float(sec), float(sec / 3600 * hourly_yen)
'''))

cells.append(code(f'''# ===== チェックポイント A: 段2 の分類とコスト計算 =====
check("A-1 分類の accuracy", round(float(accuracy_score(yb, pred)), 4), {ACC2},
      hint="HashingVectorizer(n_features=2**18, ngram_range=(1,2), alternate_sign=False, norm='l2') と "
           "SGDClassifier(loss='log_loss', alpha=1e-6, max_iter=30, random_state=0) の組み合わせ。")
check("A-2 分類の macro-F1", round(float(f1_score(yb, pred, average="macro")), 4), {F12},
      hint="average='macro' を忘れると多クラスではエラーか別の値になる。")
check("A-3 特徴量の次元", Bv.shape[1], {N_FEAT},
      hint="n_features=2**18 をそのまま指定している。語彙表を作らないので学習前から次元が決まる。")

_r = call_safely(estimate_cost, 100000, 500.0, 12.0)
check("A-4 estimate_cost の返り値は2つ組か", None if _r is None else len(_r), 2,
      hint="(所要秒数, 費用円) のタプルを返す。")
check("A-5 10万件を500件/秒で処理したときの秒数", None if _r is None else _r[0], 200.0,
      hint="100000 / 500 = 200 秒。")
check("A-6 そのときの費用(時間単価12円)", None if _r is None else _r[1], round(200.0/3600*12.0, 10),
      hint="200 / 3600 * 12。時間単価を秒に直すのを忘れずに。")

print("\\n(6つとも [OK] になったら次の概念へ)")'''))

# ---------------- 概念2 ----------------
cells.append(md("""## ① なぜ: 「重い方が精度が高い」は、いくら払う価値があるか

Day5 では同じ商品テキストを TF-IDF + ロジスティック回帰で分類し、accuracy 0.9395 を得た。
今回の軽量版は 0.9150。**差は 2.45 ポイント**。

この差に、どれだけ払う価値があるだろうか。答えは「何件処理するか」と
「間違いが1件いくらの損失か」で決まる。**精度だけを見て決めてはいけない。**"""))

cells.append(md("""## ② 解説: 精度差を「人手の確認コスト」に換算する

分類を間違えた件は、多くの実務で**人手の確認に回る**。だとすれば精度差はそのまま人件費になる。

```
追加の人件費 = 件数 × 精度差 × 1件あたりの確認コスト
```

たとえば日次10万件・精度差 2.45 ポイント・1件の確認に 5 円かかるなら、
`100000 × 0.0245 × 5 = 12,250 円/日`。これに対して、重いモデルを動かすための
インスタンス費用の増分が 1日 500 円なら、**重い方が圧倒的に安い**。

逆に、間違いが実害を生まない用途(社内の参考表示など)なら、確認コストはほぼ 0 で、
軽い方を選ぶべきだ。**同じ 2.45 ポイントでも答えが逆になる。**

### C# で言えば

「キャッシュを入れるべきか」の判断と同じ構造だ。ヒット率の改善幅だけを見ても決まらず、
「1リクエストあたりのコスト」と「リクエスト数」を掛けて初めて判断できる。"""))

cells.append(code('''# GOAL: 精度差を金額に換算し、どちらが安いかを条件ごとに出す
ACC_LIGHT = accuracy_score(yb, pred)   # 段2 の軽量分類
ACC_HEAVY = 0.9395                     # Day5 の TF-IDF + ロジスティック回帰(実測値)
gap = ACC_HEAVY - ACC_LIGHT
print(f"精度差: {gap:.4f}({ACC_HEAVY:.4f} - {ACC_LIGHT:.4f})\\n")

print(f"{'日次件数':>10s} {'確認単価':>8s} {'追加人件費/日':>14s}")
for n in (10_000, 100_000):
    for yen in (1, 5, 50):
        print(f"{n:>10,} {yen:>7}円 {n*gap*yen:>13,.0f}円")
print("\\n→ 同じ 2.45 ポイントでも、件数と確認単価で桁が変わる。")
print("  『精度が高い方を選ぶ』ではなく『いくら払う価値があるか』で決める。")'''))

cells.append(md("""## ④ 予測: 学習時間はどれくらい違う?

軽量版の学習時間は上で測った(`fit_sec`)。では Day5 の TF-IDF + ロジスティック回帰は?

1. 学習時間は **何倍**違うと思う?
2. その差は、**日々の運用**で効くだろうか。それとも一度きりの話だろうか?
3. 再学習を **毎日** 回すとしたら、答えは変わる?"""))

cells.append(code('''# GOAL: 学習の速さが効く場面と効かない場面を切り分ける
print(f"軽量版の学習: {fit_sec:.2f} 秒({len(Xa)} 件)\\n")
print("学習が速いことが効く場面:")
print("  - 毎日・毎時の再学習を回す(収集データは日々増えるので実際よくある)")
print("  - パラメータ探索を何十回も回す")
print("  - 障害復旧で作り直す必要が出たとき\\n")
print("効かない場面:")
print("  - 月1回の再学習で足りる → 学習時間はほぼ無視できる")
print("\\n→ 『速い』が価値になるかどうかは、運用の頻度で決まる。")'''))

cells.append(md("""## ⑥ 書いてみる: どちらの段を選ぶべきかを返す関数

上の考え方を関数にする。

`choose_stage(n_items_per_day, acc_light, acc_heavy, yen_per_review, extra_infra_yen_per_day)`

- 精度差による追加人件費 = `n_items_per_day × (acc_heavy - acc_light) × yen_per_review`
- これが `extra_infra_yen_per_day`(重い段を動かす追加インフラ費)**より大きければ重い段**を選ぶ
- 返り値は文字列 **`"heavy"`** か **`"light"`**(同額のときは `"light"` = 安い方)

3〜4行で書ける。

> 余談だが、実務でこの種の境界判定を書くときは**ちょうど同額**を等値で判定してはいけない。
> `10000 × (0.91 - 0.90) × 5` は Python では `500.0000000000005` になり、`> 500` を満たしてしまう。
> 二進浮動小数点では `0.91 - 0.90` が正確に `0.01` にならないからだ。
> 金額を扱うなら整数(円単位)か `decimal.Decimal` を使う。"""))

cells.append(code('''def choose_stage(n_items_per_day, acc_light, acc_heavy, yen_per_review, extra_infra_yen_per_day):
    """"heavy" か "light" を返す。"""
    # ここに書く(ヒント: 追加人件費 = 件数 × 精度差 × 確認単価。
    #           これが追加インフラ費 より大きいときだけ "heavy"。同額なら "light")
    return None
''' if not SOLVED else '''def choose_stage(n_items_per_day, acc_light, acc_heavy, yen_per_review, extra_infra_yen_per_day):
    """"heavy" か "light" を返す。"""
    review = n_items_per_day * (acc_heavy - acc_light) * yen_per_review
    return "heavy" if review > extra_infra_yen_per_day else "light"
'''))

cells.append(code('''# ===== チェックポイント B: どの段を選ぶか =====
_b1 = call_safely(choose_stage, 100000, 0.9150, 0.9395, 5.0, 500.0)
check("B-1 10万件・確認5円・追加インフラ500円/日", 1.0 if _b1 == "heavy" else 0.0, 1.0,
      hint="100000 × 0.0245 × 5 = 12,250円 > 500円。重い段を選ぶ。返り値は文字列 'heavy'。")

_b2 = call_safely(choose_stage, 1000, 0.9150, 0.9395, 1.0, 500.0)
check("B-2 1000件・確認1円・追加インフラ500円/日", 1.0 if _b2 == "light" else 0.0, 1.0,
      hint="1000 × 0.0245 × 1 = 24.5円 < 500円。軽い段のまま。")

_b3 = call_safely(choose_stage, 100000, 0.90, 0.90, 5.0, 500.0)
check("B-3 精度差ゼロのとき", 1.0 if _b3 == "light" else 0.0, 1.0,
      hint="精度差が無いなら重い段に上がる理由はない。")

_b4 = call_safely(choose_stage, 10000, 0.90, 0.91, 4.0, 500.0)
check("B-4 追加人件費 400円 < インフラ 500円 のとき", 1.0 if _b4 == "light" else 0.0, 1.0,
      hint="10000 × 0.01 × 4 = 400円 < 500円。下回るなら軽い段のまま。")

print("\\n(4つとも [OK] になったら次の概念へ)")'''))

# ---------------- 概念3 ----------------
cells.append(md("""## ① なぜ: 名寄せは、対象が増えると爆発する

Day6 で名寄せを扱ったとき、レコードが 1,340 件でペアは 897,130 通りあった。
レコードが 10 倍になればペアは **100 倍**になる。

このとき「1件あたり何ミリ秒か」だけを見ていると判断を誤る。
**コストの「形」が道具によって違う**からだ。ここを取り違えると、
検証環境では動いたのに本番で終わらない、という事故になる。"""))

cells.append(md("""## ② 解説: bi-encoder と クロスエンコーダ

同じ「2つが同じ商品か」を判定する道具でも、計算の構造がまったく違う。

| | bi-encoder(文埋め込み) | クロスエンコーダ |
|---|---|---|
| 入力 | 1件ずつ独立にベクトル化 | **ペアを丸ごと**受け取る |
| n件を全対比較 | ベクトル化 **n回** + 行列積1回 | 推論 **n(n-1)/2 回** |
| 精度 | 低め(独立に潰すので情報が落ちる) | 高い(2つを突き合わせて判断できる) |
| 使いどころ | 候補の一次絞り | 絞った候補の最終判定 |

**ベクトル化は n 回で済むが、ペア判定はペア数だけ要る。** これが「コストの形」の違いだ。

だから実務では**二段構え**にする。

```
全ペア  ──[段3 bi-encoder]──>  候補(上位K件)  ──[段4 クロスエンコーダ]──>  最終判定
897,130ペア                    数千ペア                        高精度
```

### ★ここで決まってしまうこと

二段構えには**避けられない性質**がある。**段3で落とした候補は、段4では二度と拾えない。**
つまり**一次絞りの再現率が、システム全体の上限**になる。

段4をどれだけ精密にしても、段3が 75% しか拾えていなければ 75% を超えられない。
「精度が足りない」と言われたとき、**どちらの段が原因かを切り分けられる**必要がある。"""))

cells.append(code('''# GOAL: bi-encoder で候補を絞り、コストの形の違いを数字で確かめる

# STEP 1: Day6 の名寄せデータを読む
rec = pd.read_csv(D6 / "records.csv").fillna({"brand": ""})
voc = pd.read_csv(D6 / "vocab.csv")
nz = lambda s: unicodedata.normalize("NFKC", str(s)).replace(" ", "").replace("-", "").lower()
rec["t"] = rec["title"].map(nz)
N = len(rec)
ALL_PAIRS = N * (N - 1) // 2
print(f"レコード {N} 件 → 全ペア {ALL_PAIRS:,} 通り")

# STEP 2: 疑似埋め込み(Day6 と同じ。sense_group ごとに中心ベクトル + ノイズ)
rng = np.random.default_rng(0)
DIM = 48
centers = {g: rng.normal(0, 1, DIM) for g in voc["sense_group"].unique()}
tokvec = {r.token: centers[r.sense_group] + rng.normal(0, 0.15, DIM) for r in voc.itertuples()}

def embed(t):
    hits = [v for w, v in tokvec.items() if nz(w) in t]
    if not hits:
        return np.zeros(DIM)
    x = np.mean(hits, axis=0)
    n = np.linalg.norm(x)
    return x / n if n > 0 else x

# STEP 3: ベクトル化の時間を測る(これが n 回)
t0 = time.time()
E = np.stack([embed(t) for t in rec["t"]])
bi_sec = time.time() - t0
print(f"\\nbi-encoder のベクトル化: {N} 件で {bi_sec:.3f} 秒 → {N/bi_sec:,.0f} 件/秒")
print(f"E の shape: {E.shape}  ← (件数, 次元)")

# STEP 4: 全ペアの類似度は「行列積1回」で出る
t0 = time.time()
S = E @ E.T
np.fill_diagonal(S, -9.0)
mat_sec = time.time() - t0
print(f"全 {ALL_PAIRS:,} ペアの類似度: 行列積1回で {mat_sec:.3f} 秒")
print(f"S の shape: {S.shape}")'''))

cells.append(md("""## ④ 予測: クロスエンコーダを全ペアに掛けたら?

クロスエンコーダは**ペアごとに**計算が要る。仮に1ペア 0.17 ミリ秒だとしよう。

1. 897,130 ペア全部に掛けると **何分**かかる?
2. bi-encoder のベクトル化(上で測った秒数)と比べて **何倍**?
3. レコードが 10 倍(13,400件)になったら、それぞれ何倍になる?

> 3 が本質だ。bi-encoder は 10 倍、クロスエンコーダは **100 倍** になる。
> 「1件あたり」で比べていると、この違いが見えない。"""))

cells.append(code(f'''# GOAL: コストの「形」の違いを、件数を変えて確かめる
CE_MS = 0.17     # クロスエンコーダ 1ペアあたりのミリ秒(実測に基づく仮定)

print(f"{{'レコード数':>10s}} {{'ペア数':>14s}} {{'bi-encoder':>12s}} {{'クロスエンコーダ':>16s}}")
for mult in (1, 2, 10):
    n = N * mult
    pairs_n = n * (n - 1) // 2
    bi = n * (bi_sec / N)
    ce = pairs_n * CE_MS / 1000
    print(f"{{n:>10,}} {{pairs_n:>14,}} {{bi:>10.2f}}秒 {{ce/60:>14,.1f}}分")

print("\\n→ レコードが10倍になると bi-encoder は10倍、クロスエンコーダは約100倍。")
print("  これが『コストの形』の違い。1件あたりの速度だけ見ていると気づけない。")

# 二段構え: bi-encoder で上位K件だけを候補にする
K = 10
cand = np.argsort(-S, axis=1)[:, :K]
pairs = sorted({{(min(i, j), max(i, j)) for i, row in enumerate(cand) for j in row}})
pk = rec["product_key"].to_numpy()
lab = np.array([pk[a] == pk[b] for a, b in pairs]).astype(int)
tot_pos = int(sum(v * (v - 1) // 2 for v in pd.Series(pk).value_counts()))
print(f"\\n二段構え: 上位{{K}}件を候補にすると {{len(pairs):,}} ペア(全体の {{len(pairs)/ALL_PAIRS*100:.2f}}%)")
print(f"  正例 {{int(lab.sum())}} / {{tot_pos}} = 再現率 {{lab.sum()/tot_pos:.1%}}  ← これが全体の上限になる")
print(f"  クロスエンコーダを候補だけに掛けると {{len(pairs)*CE_MS/1000:.1f}}秒(全ペアなら {{ALL_PAIRS*CE_MS/1000/60:.1f}}分)")'''))

cells.append(md(f"""## ⑥ 書いてみる: 一次絞りの再現率を測る関数

二段構えを組んだら、**まず一次絞りの再現率を測る**。ここが全体の上限だからだ。

次のセルで `candidate_recall(sim_matrix, group_keys, k)` を書こう。

| 引数 | 意味 |
|---|---|
| `sim_matrix` | `(n, n)` の類似度行列。対角は既に `-9.0` にしてある |
| `group_keys` | 長さ `n` の配列。同じ値なら同一商品 |
| `k` | 各行から上位いくつを候補にするか |

返り値は **`(候補ペア数, 候補に含まれた正例数, 再現率)` の3つ組**。

- 候補ペアは `(i, j)` と `(j, i)` を**同じものとして1回**数える(`min`/`max` で正規化して集合に入れる)
- 正例の総数は「同じ `group_keys` を持つレコードから作れるペアの数」の合計。
  グループのサイズが `v` なら `v*(v-1)//2` 件
- 再現率 = 候補に含まれた正例 / 正例の総数

6〜10行で書ける。`np.argsort(-sim_matrix, axis=1)[:, :k]` で各行の上位 k が取れる。"""))

cells.append(code('''def candidate_recall(sim_matrix, group_keys, k):
    """(候補ペア数, 候補内の正例数, 再現率) を返す。"""
    # ここに書く(ヒント: 上位k件を np.argsort(-sim_matrix, axis=1)[:, :k] で取り、
    #           (min(i,j), max(i,j)) の集合にしてから、group_keys が一致するペアを数える。
    #           正例の総数は pd.Series(group_keys).value_counts() から v*(v-1)//2 の合計)
    return None
''' if not SOLVED else '''def candidate_recall(sim_matrix, group_keys, k):
    """(候補ペア数, 候補内の正例数, 再現率) を返す。"""
    g = np.asarray(group_keys)
    top = np.argsort(-sim_matrix, axis=1)[:, :k]
    ps = {(min(i, j), max(i, j)) for i, row in enumerate(top) for j in row}
    pos = sum(1 for a, b in ps if g[a] == g[b])
    total = int(sum(v * (v - 1) // 2 for v in pd.Series(g).value_counts()))
    return len(ps), pos, pos / total
'''))

cells.append(code(f'''# ===== チェックポイント C: 二段構えの一次絞り =====
_c = call_safely(candidate_recall, S, pk, 10)
check("C-1 返り値は3つ組か", None if _c is None else len(_c), 3,
      hint="(候補ペア数, 正例数, 再現率) を返す。")
check("C-2 候補ペア数", None if _c is None else _c[0], {N_CAND},
      hint="(i,j) と (j,i) を1回だけ数える。集合に入れる前に min/max で正規化する。")
check("C-3 候補に含まれた正例数", None if _c is None else _c[1], {N_CAND_POS},
      hint="group_keys が一致するペアの数。")
check("C-4 再現率", None if _c is None else round(float(_c[2]), 4), {RECALL_CAND},
      hint="正例の総数は各グループの v*(v-1)//2 の合計。ここでは {TOT_POS} 件。")

_c2 = call_safely(candidate_recall, S, pk, 3)
check("C-5 k を 3 に下げたとき、候補は減るか",
      None if _c2 is None or _c is None else (1.0 if _c2[0] < _c[0] else 0.0), 1.0,
      hint="k を小さくすると候補は減り、再現率も下がる。速さと取りこぼしのトレードオフ。")

print("\\n(5つとも [OK] になったら次の概念へ)")
if _c is not None:
    print(f"\\n候補生成の再現率 = {{_c[2]:.1%}} → この二段構えの精度は、"
          f"どれだけ段4を頑張っても {{_c[2]:.1%}} を超えられない")'''))

# ---------------- 概念4 ----------------
cells.append(md("""## ① なぜ: 「機械学習を使うべきか」は、驚くほど雑に決められている

商品タイトルからブランド名と型番を抽出したい。正規表現で書くか、モデルを学習させるか。

この判断は実務で頻繁に発生するのに、**根拠なく決められがち**だ。
「機械学習の方が賢いから」でも「正規表現で十分だろう」でもなく、
**同じ基準で測って決める**。しかも答えは対象によって変わる。"""))

cells.append(md("""## ② 解説: 対象の性質を見る

抽出したいものには2種類ある。

| 種類 | 例 | 性質 | 向いている道具 |
|---|---|---|---|
| **列挙できる** | ブランド名、色、カテゴリ | 有限で、一覧を持てる | **辞書**(完全一致) |
| **書式で決まる** | 型番、価格、日付 | 一覧は作れないが規則性がある | 規則 or **学習モデル** |

そして「書式で決まる」ものには落とし穴がある。**書式は1つとは限らない。**

```
最初:  A123-45 だけ  → 正規表現1本で足りる
数週間後: AB-1234 が現れる → 正規表現を継ぎ足す
さらに: 1234-XY が現れる  → また継ぎ足す
```

スクレイピングではメーカーごとに書式が違い、**新しい書式が増え続ける**。
継ぎ足し続ける正規表現はいずれ破綻する。学習モデルは、複数の書式を見せておけば
**その周辺に手が届く**可能性がある。

### 段5 で使う道具: 文字単位の系列ラベリング

1文字ずつに **BIO タグ**を付ける。`B-MODEL` は型番の開始、`I-MODEL` は続き、`O` はそれ以外。

```
Ｘ ８ ７ ５ － ４ ６  ゲ ン ブ
B  I  I  I  I  I  I  B  I  I     ← MODEL / BRAND
```

特徴量には**文字そのもの**と**文字クラス**(数字/英字/カタカナ/漢字/記号)の窓を使う。
文字クラスを入れるのが要点で、これがあると「英字の次に数字が3つ」のような
**綴りを覚えていない書式**にも手が届く。"""))

cells.append(code('''# GOAL: 規則と系列ラベリングを、同じ基準(正規形の完全一致)で比較する

# STEP 1: unit12 のデータ。タイトルからブランド・型番・色を抽出する
tr12 = pd.read_csv(HERE / "ner_train.csv").fillna({"brand": ""})
te12 = pd.read_csv(HERE / "ner_test.csv")
ANS = HERE.resolve().parents[1] / ".solutions" / "unit12-lightweight-model-ladder" / "_answer.csv"
te12 = te12.merge(pd.read_csv(ANS).fillna({"brand": ""}), on="record_id")
KNOWN_BRANDS = sorted(set(tr12["brand"]) - {""})
print(f"train {len(tr12)} / test {len(te12)} / train に出るブランド {len(KNOWN_BRANDS)} 種")
print("\\n例:")
for _, r in tr12.head(3).iterrows():
    print(f"  {r['title']}")
    print(f"    → brand={r['brand'] or '(なし)'} model={r['model_code']} color={r['color']}")

# STEP 2: test にだけ含まれる「未知」を確認する
newfmt = te12["model_code"].str.match(r"^[0-9]{4}-[A-Z]{2}$").to_numpy()
unseen = (~te12["brand"].isin(KNOWN_BRANDS + [""])).to_numpy()
print(f"\\ntest のうち train に無い型番書式: {newfmt.mean():.1%}")
print(f"test のうち train に無いブランド : {unseen.mean():.1%}")

# STEP 3: 段0 = 最初に書いた1書式の正規表現 + ブランド辞書
PAT = re.compile(r"[A-Za-z][0-9]{3}-?[0-9]{2}")

def rule_model(t):
    n = unicodedata.normalize("NFKC", t)
    m = PAT.search(n)
    if not m:
        return ""
    s = m.group(0)
    return s if "-" in s else s[:4] + "-" + s[4:]

def rule_brand(t):
    n = unicodedata.normalize("NFKC", t)
    return next((b for b in KNOWN_BRANDS if b in n), "")

t0 = time.time()
rm = [rule_model(t) for t in te12["title"]]
rb = [rule_brand(t) for t in te12["title"]]
rule_rate = len(te12) / (time.time() - t0)
eq = lambda a, b: np.array([x == y for x, y in zip(a, b)])
print(f"\\n段0 規則: {rule_rate:,.0f} 件/秒")
print(f"  型番   全体 {eq(rm, te12['model_code']).mean():.4f} / 既知書式 {eq(rm, te12['model_code'])[~newfmt].mean():.4f}")
print(f"  ブランド 既知 {eq(rb, te12['brand'])[~unseen].mean():.4f}")'''))

cells.append(md("""## ④ 予測: 系列ラベリングは規則に勝つか

次のセルで文字単位のタガーを学習させる。実行する前に予測してほしい。

1. **型番**(train に書式が2種類ある)では、どちらが勝つ?
2. **ブランド**(train に出るものは辞書に全部載っている)では、どちらが勝つ?
3. **train に無い書式**では、タガーは手が届く? それとも規則と同じく 0 点?

> 3 つの問いで答えが違う、というのがこの概念の核心だ。
> 「学習モデルの方が賢い」でも「規則で十分」でもない。"""))

cells.append(code('''# GOAL: 文字単位の系列ラベリングを学習させ、規則と同じ基準で比べる
def cclass(c):
    """文字クラス。綴りを覚えていない書式にも手が届くようにするための特徴。"""
    if c.isdigit() or "０" <= c <= "９": return "D"      # 数字
    if c.isascii() and c.isalpha(): return "A"           # 半角英字
    if "Ａ" <= c <= "Ｚ" or "ａ" <= c <= "ｚ": return "Af"  # 全角英字
    if "ァ" <= c <= "ヶ" or "ｦ" <= c <= "ﾟ": return "K"   # カタカナ
    if "一" <= c <= "龥": return "H"                      # 漢字
    return "S"

def cfeat(t, i):
    g = lambda k: t[k] if 0 <= k < len(t) else "<>"
    return {f"c0={g(i)}": 1, f"c-1={g(i-1)}": 1, f"c+1={g(i+1)}": 1,
            f"k0={cclass(g(i))}": 1, f"k-1={cclass(g(i-1))}": 1, f"k+1={cclass(g(i+1))}": 1,
            f"k+2={cclass(g(i+2))}": 1, f"k-2={cclass(g(i-2))}": 1,
            f"K3={cclass(g(i-1))}{cclass(g(i))}{cclass(g(i+1))}": 1,
            f"K5={cclass(g(i-2))}{cclass(g(i-1))}{cclass(g(i))}{cclass(g(i+1))}{cclass(g(i+2))}": 1,
            f"bos={i==0}": 1, f"eos={i==len(t)-1}": 1}

XX, YY = [], []
for t, b in zip(tr12["title"], tr12["bio"]):
    tg = b.split()
    for i in range(len(t)):
        XX.append(cfeat(t, i)); YY.append(tg[i])
dv = DictVectorizer()
t0 = time.time()
tagger = LogisticRegression(max_iter=400, C=4.0, n_jobs=-1).fit(dv.fit_transform(XX), YY)
tag_fit = time.time() - t0
print(f"学習: {tag_fit:.1f} 秒({len(YY):,} 文字)")

def tag_decode(t):
    P = list(tagger.predict(dv.transform([cfeat(t, i) for i in range(len(t))])))
    out, cur, s = {}, None, 0
    for i, p in enumerate(P + ["O"]):
        if cur and (i == len(P) or p != f"I-{cur}"):
            out.setdefault(cur, t[s:i]); cur = None
        if i < len(P) and p.startswith("B-"):
            cur, s = p[2:], i
    return out

def norm_model(s):
    """抜き出した綴りを正規形に直す(全角→半角、ハイフン復元)。"""
    if not s: return ""
    s = unicodedata.normalize("NFKC", s)
    if "-" in s: return s
    if re.match(r"^[A-Z][0-9]{5}$", s): return s[:4] + "-" + s[4:]
    if re.match(r"^[A-Z]{2}[0-9]{4}$", s): return s[:2] + "-" + s[2:]
    if re.match(r"^[0-9]{4}[A-Z]{2}$", s): return s[:4] + "-" + s[4:]
    return s

t0 = time.time()
dec = [tag_decode(t) for t in te12["title"]]
tag_rate = len(te12) / (time.time() - t0)
nm = [norm_model(d.get("MODEL", "")) for d in dec]
nb_ = [d.get("BRAND", "") for d in dec]

print(f"\\n{'':22s} {'型番:既知書式':>12s} {'型番:新書式':>11s} {'ブランド:既知':>13s}")
print(f"{'段0 規則':22s} {eq(rm, te12['model_code'])[~newfmt].mean():>12.4f} "
      f"{eq(rm, te12['model_code'])[newfmt].mean():>11.4f} {eq(rb, te12['brand'])[~unseen].mean():>13.4f}")
print(f"{'段5 系列ラベリング':22s} {eq(nm, te12['model_code'])[~newfmt].mean():>12.4f} "
      f"{eq(nm, te12['model_code'])[newfmt].mean():>11.4f} {eq(nb_, te12['brand'])[~unseen].mean():>13.4f}")
print(f"\\n速度: 規則 {rule_rate:,.0f} 件/秒 / 系列ラベリング {tag_rate:,.0f} 件/秒"
      f"({rule_rate/tag_rate:,.0f} 倍の差)")'''))

cells.append(md(f"""## ⑥ 書いてみる: 対象の性質から道具を選ぶ関数

上の表から読み取れることを関数にする。

`pick_extractor(is_enumerable, n_known_formats)`

| 引数 | 意味 |
|---|---|
| `is_enumerable` | 対象が列挙できるか(ブランド名なら `True`、型番なら `False`) |
| `n_known_formats` | 確認できている書式の種類数 |

返り値は文字列で:

- 列挙できるなら **`"dictionary"`**(辞書が速くて正確)
- 列挙できず、書式が **1種類**なら **`"rule"`**(正規表現1本で足りる)
- 列挙できず、書式が **2種類以上**なら **`"model"`**(継ぎ足しが破綻するので学習モデル)

3〜5行で書ける。上の実測がそのまま根拠になっている。"""))

cells.append(code('''def pick_extractor(is_enumerable, n_known_formats):
    """"dictionary" / "rule" / "model" のいずれかを返す。"""
    # ここに書く(ヒント: まず列挙できるかで分ける。
    #           列挙できないなら、書式が1種類か2種類以上かで分ける)
    return None
''' if not SOLVED else '''def pick_extractor(is_enumerable, n_known_formats):
    """"dictionary" / "rule" / "model" のいずれかを返す。"""
    if is_enumerable:
        return "dictionary"
    return "rule" if n_known_formats <= 1 else "model"
'''))

cells.append(code(f'''# ===== チェックポイント D: 規則 と 学習モデルの使い分け =====
check("D-1 規則の型番(既知書式)", round(float(eq(rm, te12["model_code"])[~newfmt].mean()), 4), {RM_KNOWN},
      hint="正規表現は自分が書いた1書式にしか当たらない。")
check("D-2 タガーの型番(既知書式)", round(float(eq(nm, te12["model_code"])[~newfmt].mean()), 4), {NM_KNOWN},
      hint="train に2書式あるので、タガーは両方を吸収している。")
check("D-3 規則のブランド(既知)", round(float(eq(rb, te12["brand"])[~unseen].mean()), 4), {RB_KNOWN},
      hint="辞書に載っているブランドは完全一致で拾える。")
check("D-4 タガーのブランド(既知)", round(float(eq(nb_, te12["brand"])[~unseen].mean()), 4), {NB_KNOWN},
      hint="列挙できる対象では、学習モデルは辞書に勝てない。")
check("D-5 タガーの型番(train に無い書式)", round(float(eq(nm, te12["model_code"])[newfmt].mean()), 4), {NM_NEW},
      hint="例が無ければ学習モデルも学べない。ここが段5の限界。")

_d = [call_safely(pick_extractor, True, 1), call_safely(pick_extractor, False, 1),
      call_safely(pick_extractor, False, 3)]
check("D-6 ブランド(列挙できる)", 1.0 if _d[0] == "dictionary" else 0.0, 1.0,
      hint="返り値は文字列 'dictionary'。")
check("D-7 型番・書式1種類", 1.0 if _d[1] == "rule" else 0.0, 1.0, hint="正規表現1本で足りる。")
check("D-8 型番・書式3種類", 1.0 if _d[2] == "model" else 0.0, 1.0,
      hint="継ぎ足しが破綻する。学習モデルへ。")

print("\\n(8つとも [OK] になったら振り返りへ)")'''))

# ---------------- まとめ ----------------
cells.append(md("""## 振り返り

以下に1〜2文で書いてみよう(このセルを編集して構わない)。

- **今日学んだことを自分の言葉で**:
- **難しかったこと(あれば)**:

答えを書いたら、次のまとめを読んでからチューターに報告してほしい。"""))

cells.append(md("""## まとめ

今日つかんだこと。

1. **測ってから手を入れる** — 分類パイプラインでは、推論より前処理の方が桁違いに重かった。
   モデルを速くしても全体は変わらない。**律速を測らずに最適化してはいけない。**
2. **精度差は金額に換算して初めて判断できる** — 同じ 2.45 ポイントでも、
   件数と確認単価によって「重い段に上がるべき」と「軽いままでよい」が逆転する。
3. **コストには「形」がある** — bi-encoder は件数に比例、クロスエンコーダはペア数に比例。
   レコードが10倍になると前者は10倍、後者は100倍。**1件あたりの速度だけ見ていると気づけない。**
4. **一次絞りが全体の上限を決める** — 二段構えでは、段3で落とした候補を段4は拾えない。
   「精度が足りない」と言われたら、どちらの段が原因かを切り分ける。
5. **対象の性質で答えが変わる** — 列挙できるものは辞書、書式が増え続けるものは学習モデル、
   例が1つも無い書式はどちらも無力。**「上の段ほど良い」ではない。**

### この先で使う

- **演習 ex01〜ex04** — 実際に段を組み、件数と精度要求から「どこで止めるか」を答える
- **実務** — 新しい抽出タスクを渡されたとき、まず「これは列挙できるか」「書式は何種類か」
  「日次何件か」を確認する。その3つが決まれば、どの段から始めるかは自動的に決まる

### 生成 LLM について

このレッスンでは扱わなかった。本番サーバー(CPU のみ)に載らないからだ。
だが「載らない」と判断できたのは、**ここで測った数字があるから**でもある。
段2 が 1件 0.01 ミリ秒で済む仕事に、1件 数百ミリ秒かかる道具を持ち出す理由はない。

**道具の順番を知っていることが、いちばん安い最適化になる。**"""))

nb = nbf.v4.new_notebook()
nb.cells = cells
nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
for c in nb.cells:
    if c.cell_type == "code":
        c["outputs"] = []
        c["execution_count"] = None

out = UNIT / ("lesson_solved.ipynb" if SOLVED else "lesson.ipynb")
nbf.write(nb, str(out))
print(f"   → {out}  ({len(nb.cells)} セル)")
