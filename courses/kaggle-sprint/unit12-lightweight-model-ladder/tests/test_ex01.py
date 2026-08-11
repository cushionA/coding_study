from pathlib import Path

from conftest import load_exercise
import numpy as np
import pandas as pd
import pytest

ex = load_exercise("ex01_light_classifier")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# 「alpha が入っていれば a / bravo が入っていれば b」で完全に分かれる小さなコーパス
DOCS = [
    "alpha beta gamma",
    "alpha delta",
    "alpha epsilon zeta",
    "bravo kilo",
    "bravo lima mike",
    "bravo november",
]
LABELS = ["a", "a", "a", "b", "b", "b"]


class _FixedPredictor:
    """predict が常に決まったラベルを返す偽の分類器(指標の計算だけを確かめるために使う)。"""

    def __init__(self, preds):
        self.preds = np.array(preds)

    def predict(self, X):
        assert X.shape[0] == len(self.preds), (
            f"ベクトル化した行列の行数が {X.shape[0]} になっている。"
            "docs の件数と一致しない場合、transform に渡すものを間違えている"
        )
        return self.preds


# build_vectorizer: transform の結果は (文書数, n_features) の行列になる
def test_build_vectorizer_shape():
    hv = ex.build_vectorizer(2**14)
    X = hv.transform(DOCS)
    assert X.shape == (6, 16384), (
        "shape は (文書数, 特徴量の次元)。(16384, 6) になっているなら行と列が逆"
    )


# build_vectorizer: alternate_sign を切っているので値は全て非負になる
def test_build_vectorizer_non_negative():
    hv = ex.build_vectorizer(2**14)
    X = hv.transform(DOCS)
    assert X.data.min() >= 0.0, (
        "負の値が出ている = 符号の交互付与が有効なまま。alternate_sign の設定を確認する"
    )


# build_vectorizer: norm='l2' なので各行のノルムが 1 になる
def test_build_vectorizer_l2_normalized():
    hv = ex.build_vectorizer(2**14)
    X = hv.transform(DOCS)
    norms = np.sqrt(np.asarray(X.multiply(X).sum(axis=1)).ravel())
    assert norms == pytest.approx([1.0] * 6), "各行の L2 ノルムが 1 でない = norm の設定が違う"


# build_vectorizer: 次元と n-gram の設定が引数どおりに効く
def test_build_vectorizer_respects_arguments():
    hv = ex.build_vectorizer(2**10, analyzer="char", ngram_range=(2, 2))
    X = hv.transform(["abc"])
    assert X.shape == (1, 1024), "n_features の値がそのまま列数になるはず"
    assert X.nnz == 2, "'abc' の文字2-gram は 'ab' と 'bc' の2つ。analyzer が効いていない可能性"


# fit_light_classifier + evaluate_light_classifier: 分かれているデータは満点になる
def test_fit_and_evaluate_separable():
    hv = ex.build_vectorizer(2**14)
    clf = ex.fit_light_classifier(hv, DOCS, LABELS)
    metrics = ex.evaluate_light_classifier(hv, clf, DOCS, LABELS)

    assert set(metrics) == {"accuracy", "macro_f1", "n_features"}, (
        "戻り値のキーは accuracy / macro_f1 / n_features の3つ"
    )
    assert metrics["accuracy"] == pytest.approx(1.0)
    assert metrics["macro_f1"] == pytest.approx(1.0)
    assert metrics["n_features"] == 16384, "n_features はベクトル化した行列の列数"


# evaluate_light_classifier: macro-F1 は accuracy と一致しない(平均の取り方が違う)
def test_evaluate_macro_f1_differs_from_accuracy():
    hv = ex.build_vectorizer(2**14)
    labels = ["a", "a", "a", "b", "b", "c"]
    fake = _FixedPredictor(["a", "a", "a", "b", "c", "c"])

    metrics = ex.evaluate_light_classifier(hv, fake, DOCS, labels)

    assert metrics["accuracy"] == pytest.approx(5 / 6), "6件中5件が一致している"
    assert metrics["macro_f1"] == pytest.approx(7 / 9), (
        "クラスごとの F1 は a=1.0 / b=2/3 / c=2/3 で、その単純平均は 7/9 = 0.7778。"
        "0.8333 になるなら average の指定が macro になっていない"
    )


# throughput: 件/秒 が正の float で返り、全ての要素に fn が適用される
def test_throughput_counts_all_items():
    seen = []
    rate = ex.throughput(lambda s: seen.append(s), ["x"] * 500)

    assert isinstance(rate, float), "件/秒 は float で返す"
    assert rate > 0.0
    assert len(seen) == 500, "全件に fn を適用していない(件数と経過時間の対応が取れなくなる)"


# 実データ: 商品タイトルから色を当てる。文字 n-gram なら形態素解析なしでも段2は成立する
def test_light_classifier_on_real_titles():
    df = pd.read_csv(DATA_DIR / "ner_train.csv")
    assert df.shape == (3200, 7), "ner_train.csv は 3200行 × 7列"

    hv = ex.build_vectorizer(2**16, analyzer="char_wb", ngram_range=(2, 3))
    X = hv.transform(df["title"])
    assert X.shape == (3200, 65536), "shape は (件数, 次元)"

    train_docs, test_docs = df["title"][:2560], df["title"][2560:]
    train_y, test_y = df["color"][:2560], df["color"][2560:]
    assert len(test_docs) == 640

    clf = ex.fit_light_classifier(hv, train_docs, train_y)
    metrics = ex.evaluate_light_classifier(hv, clf, test_docs, test_y)

    assert metrics["n_features"] == 65536
    assert metrics["accuracy"] >= 0.90, (
        f"accuracy が {metrics.get('accuracy')} と低すぎる。"
        "学習用と評価用のデータを取り違えていないか、ラベルの列が正しいかを確認する"
    )
    assert metrics["macro_f1"] >= 0.90
