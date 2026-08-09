import torch
from transformers import T5Config, T5ForConditionalGeneration


def build_tiny_t5(vocab_size=64, device=None):
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    config = T5Config(
        vocab_size=vocab_size,
        d_model=32,
        d_ff=64,
        num_layers=1,
        num_decoder_layers=1,
        num_heads=2,
        d_kv=16,
        dropout_rate=0.0,
        pad_token_id=0,
        decoder_start_token_id=0,
        eos_token_id=1,
    )
    return T5ForConditionalGeneration(config).to(device)


def prepare_batch(input_ids, labels, pad_id=0, device=None):
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    input_tensor = torch.as_tensor(input_ids, dtype=torch.long, device=device)
    label_tensor = torch.as_tensor(labels, dtype=torch.long, device=device).clone()
    attention_mask = (input_tensor != pad_id).long()
    label_tensor[label_tensor == pad_id] = -100
    return {"input_ids": input_tensor, "attention_mask": attention_mask, "labels": label_tensor}


def train_tiny_t5(model, batch, steps=3, learning_rate=0.01):
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    losses = []
    model.train()
    for _ in range(steps):
        optimizer.zero_grad()
        loss = model(**batch).loss
        loss.backward()
        optimizer.step()
        losses.append(float(loss.detach()))
    return losses


@torch.inference_mode()
def generate_with_t5(model, input_ids, attention_mask, max_new_tokens=4, num_beams=1):
    model.eval()
    return model.generate(
        input_ids=input_ids,
        attention_mask=attention_mask,
        max_new_tokens=max_new_tokens,
        num_beams=num_beams,
    )
