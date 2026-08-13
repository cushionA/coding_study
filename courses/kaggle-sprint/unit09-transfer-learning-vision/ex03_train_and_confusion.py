"""ex03: PyTorch の学習ループと混同行列による誤り分析。"""

import numpy as np
import torch
from collections.abc import Sequence
from torch import nn
from torch.optim import Optimizer
from torch.utils.data import DataLoader
from sklearn.metrics import confusion_matrix


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    optimizer: Optimizer,
    device: str = "cpu",
) -> float:
    """1 epoch 学習してサンプル平均 loss を返す。"""
    model.train()
    total_loss = 0.0
    total_samples = 0
    loss_function = torch.nn.CrossEntropyLoss()
    for batch in dataloader:
        images = batch["image"].to(device)
        labels = batch["label"].to(device)
        optimizer.zero_grad()
        # TODO: 順伝播、loss 計算、逆伝播、optimizer 更新を行う
        raise NotImplementedError
        total_loss += float(loss.detach()) * len(labels)
        total_samples += len(labels)
    return total_loss / total_samples


@torch.inference_mode()
def predict_probabilities(
    model: nn.Module, dataloader: DataLoader, device: str = "cpu"
) -> tuple[torch.Tensor, torch.Tensor]:
    """全バッチの softmax 確率と正解ラベルを返す。"""
    model.eval()
    probabilities = []
    labels = []
    for batch in dataloader:
        logits = model(batch["image"].to(device))
        # TODO: logits を確率へ変換して CPU へ集める
        raise NotImplementedError
        labels.append(batch["label"])
    return torch.cat(probabilities), torch.cat(labels)


def make_confusion(
    y_true: np.ndarray, y_pred: np.ndarray, labels: Sequence[int]
) -> np.ndarray:
    """labels 順の混同行列を返す。"""
    # TODO: sklearn の confusion_matrix へ labels を明示する
    raise NotImplementedError


def per_class_metrics(
    matrix: np.ndarray, labels: Sequence[int]
) -> dict[int, dict[str, float]]:
    """混同行列からクラス別 precision/recall を返す。"""
    matrix = np.asarray(matrix, dtype=float)
    result = {}
    for index, label in enumerate(labels):
        true_positive = matrix[index, index]
        # TODO: 列和と行和を分母にし、0 除算を避けて指標を計算する
        raise NotImplementedError
    return result


def misclassified_ids(
    sample_ids: Sequence[str], y_true: np.ndarray, y_pred: np.ndarray
) -> list[str]:
    """誤分類された sample ID を返す。"""
    # TODO: true と pred が異なる位置の ID を選ぶ
    raise NotImplementedError
