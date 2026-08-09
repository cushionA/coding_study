from conftest import load_exercise
import numpy as np

ex = load_exercise("ex04_capstone")


# 候補ペアから3種類の数値特徴を同じ行順で作るか確認する。
def test_build_pair_features_contract():
    features = ex.build_pair_features(
        ["apple", "apple", "banana"],
        [100, 105, 300],
        [[1, 0], [0.9, 0.1], [0, 1]],
        [(0, 1), (0, 2)],
    )
    assert features.shape == (2, 3)
    assert features[0, 0] > features[1, 0]
    assert features[0, 1] < features[1, 1]
    assert features[0, 2] > features[1, 2]


# 特徴から同一ペア確率を出せる学習済み分類器か確認する。
def test_fit_pair_classifier_predicts_probability():
    features = np.array([[1, 0, 1], [0.9, 2, 0.9], [0.1, 100, 0], [0.2, 80, 0.1]])
    model = ex.fit_pair_classifier(features, [1, 1, 0, 0])
    probability = model.predict_proba(features)[:, 1]
    assert probability.shape == (4,)
    assert probability[:2].mean() > probability[2:].mean()


# 検証 F1 が最大となる閾値を選ぶか確認する。
def test_select_f1_threshold_finds_perfect_split():
    threshold, score = ex.select_f1_threshold([0, 0, 1, 1], [0.1, 0.4, 0.8, 0.9], [0.3, 0.5, 0.85])
    assert threshold == 0.5
    assert score == 1.0


# ペアの推移的なつながりと孤立行を別 group に保つか確認する。
def test_connected_components_transitive_and_isolated():
    labels = ex.connected_components(6, [(0, 1), (1, 2), (3, 4)])
    assert labels[0] == labels[1] == labels[2]
    assert labels[3] == labels[4]
    assert len({labels[0], labels[3], labels[5]}) == 3
