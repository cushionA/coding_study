"""ex04_capstone: 小さな BERT を構築し、分類 fine-tuning を一周させる。"""

from copy import deepcopy

import torch
from transformers import BertConfig, BertForSequenceClassification


def build_tiny_bert(
    vocab_size: int, num_labels: int, max_length: int = 32
) -> BertForSequenceClassification:
    """ダウンロードなしで学習できる極小 BERT 分類器を返す。"""
    config = BertConfig(
        vocab_size=vocab_size,
        num_labels=num_labels,
        max_position_embeddings=max_length,
        hidden_size=16,
        num_hidden_layers=1,
        num_attention_heads=2,
        intermediate_size=32,
        hidden_dropout_prob=0.0,
        attention_probs_dropout_prob=0.0,
    )
    # TODO: 設定オブジェクトから分類用 BERT を生成して返す
    raise NotImplementedError


def fine_tune(
    model: BertForSequenceClassification,
    train_batch: dict[str, torch.Tensor],
    validation_batch: dict[str, torch.Tensor],
    steps: int = 8,
    learning_rate: float = 0.05,
) -> dict[str, object]:
    """更新後の validation loss と同じ時点の最良重みを保存・復元する。"""
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    history = []
    best_loss = float("inf")
    best_step = -1
    best_state = None

    model.train()
    for step in range(steps):
        optimizer.zero_grad()
        # TODO: train batch で順伝播・逆伝播・更新を行う
        raise NotImplementedError

        model.eval()
        with torch.inference_mode():
            # TODO: 更新後の重みを validation batch で評価する
            raise NotImplementedError
        value = float(validation_loss.detach())
        history.append(value)
        if value < best_loss:
            best_loss = value
            best_step = step
            best_state = deepcopy(model.state_dict())
        model.train()

    model.load_state_dict(best_state)
    return {"validation_losses": history, "best_step": best_step, "best_loss": best_loss}


@torch.inference_mode()
def predict(
    model: BertForSequenceClassification,
    input_ids: torch.Tensor,
    attention_mask: torch.Tensor,
) -> torch.Tensor:
    """推論モードでクラス ID を返す。"""
    model.eval()
    # TODO: logits を計算し、クラス方向の最大位置を返す
    raise NotImplementedError
