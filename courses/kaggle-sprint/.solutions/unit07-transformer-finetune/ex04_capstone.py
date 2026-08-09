from copy import deepcopy

import torch
from transformers import BertConfig, BertForSequenceClassification


def build_tiny_bert(vocab_size, num_labels, max_length=32):
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
    return BertForSequenceClassification(config)


def fine_tune(model, train_batch, validation_batch, steps=8, learning_rate=0.05):
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    history = []
    best_loss = float("inf")
    best_step = -1
    best_state = None
    model.train()
    for step in range(steps):
        optimizer.zero_grad()
        output = model(**train_batch)
        loss = output.loss
        loss.backward()
        optimizer.step()
        model.eval()
        with torch.inference_mode():
            validation_loss = model(**validation_batch).loss
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
def predict(model, input_ids, attention_mask):
    model.eval()
    logits = model(input_ids=input_ids, attention_mask=attention_mask).logits
    return logits.argmax(dim=-1)
