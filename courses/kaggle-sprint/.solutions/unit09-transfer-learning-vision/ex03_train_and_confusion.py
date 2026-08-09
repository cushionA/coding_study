import numpy as np
import torch
from sklearn.metrics import confusion_matrix


def train_one_epoch(model, dataloader, optimizer, device="cpu"):
    model.train()
    total_loss = 0.0
    total_samples = 0
    loss_function = torch.nn.CrossEntropyLoss()
    for batch in dataloader:
        images = batch["image"].to(device)
        labels = batch["label"].to(device)
        optimizer.zero_grad()
        logits = model(images)
        loss = loss_function(logits, labels)
        loss.backward()
        optimizer.step()
        total_loss += float(loss.detach()) * len(labels)
        total_samples += len(labels)
    return total_loss / total_samples


@torch.inference_mode()
def predict_probabilities(model, dataloader, device="cpu"):
    model.eval()
    probabilities = []
    labels = []
    for batch in dataloader:
        logits = model(batch["image"].to(device))
        probabilities.append(torch.softmax(logits, dim=1).cpu())
        labels.append(batch["label"])
    return torch.cat(probabilities), torch.cat(labels)


def make_confusion(y_true, y_pred, labels):
    return confusion_matrix(y_true, y_pred, labels=labels)


def per_class_metrics(matrix, labels):
    matrix = np.asarray(matrix, dtype=float)
    result = {}
    for index, label in enumerate(labels):
        true_positive = matrix[index, index]
        column_total = matrix[:, index].sum()
        row_total = matrix[index, :].sum()
        result[label] = {
            "precision": float(true_positive / column_total) if column_total else 0.0,
            "recall": float(true_positive / row_total) if row_total else 0.0,
        }
    return result


def misclassified_ids(sample_ids, y_true, y_pred):
    return [sample_id for sample_id, truth, pred in zip(sample_ids, y_true, y_pred) if truth != pred]
