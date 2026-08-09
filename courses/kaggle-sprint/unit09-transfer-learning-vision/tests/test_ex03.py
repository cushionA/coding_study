from conftest import load_exercise
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader

ex = load_exercise("ex03_train_and_confusion")


def _loader():
    samples = [
        {"image": torch.tensor([-2.0, 0.0]), "label": 0},
        {"image": torch.tensor([-1.0, 0.0]), "label": 0},
        {"image": torch.tensor([1.0, 0.0]), "label": 1},
        {"image": torch.tensor([2.0, 0.0]), "label": 1},
    ]
    return DataLoader(samples, batch_size=4, shuffle=False)


# 逆伝播を含む1 epochで実際の nn.Module の重みが変化するか確認する。
def test_train_one_epoch_updates_model():
    torch.manual_seed(3)
    model = nn.Linear(2, 2)
    before = model.weight.detach().clone()
    loss = ex.train_one_epoch(model, _loader(), torch.optim.SGD(model.parameters(), lr=0.2))
    assert np.isfinite(loss) and loss > 0
    assert not torch.equal(before, model.weight)


# 推論が全サンプル分の確率とラベルを返すか確認する。
def test_predict_probabilities_contract():
    model = nn.Linear(2, 2)
    probabilities, labels = ex.predict_probabilities(model, _loader())
    assert probabilities.shape == (4, 2)
    assert torch.allclose(probabilities.sum(dim=1), torch.ones(4))
    assert labels.tolist() == [0, 0, 1, 1]


# 指定したラベル順で混同行列を作るか確認する。
def test_make_confusion_label_order():
    matrix = ex.make_confusion([0, 1, 0], [0, 0, 1], [0, 1])
    assert np.array_equal(matrix, [[1, 1], [1, 0]])


# 行・列の向きを取り違えずクラス別指標を計算するか確認する。
def test_per_class_metrics_values():
    result = ex.per_class_metrics(np.array([[8, 2], [1, 9]]), ["A", "B"])
    assert np.isclose(result["A"]["recall"], 0.8)
    assert np.isclose(result["B"]["precision"], 9 / 11)


# 誤分類したサンプル ID だけを元の順序で返すか確認する。
def test_misclassified_ids():
    assert ex.misclassified_ids(["a", "b", "c"], [0, 1, 1], [0, 0, 1]) == ["b"]
