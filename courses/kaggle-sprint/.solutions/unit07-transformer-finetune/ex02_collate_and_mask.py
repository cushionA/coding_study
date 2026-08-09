import numpy as np


def dynamic_pad(sequences, pad_id=0, max_length=None):
    sequences = [list(seq) for seq in sequences]
    length = max((len(seq) for seq in sequences), default=0)
    if max_length is not None:
        length = min(length, max_length)
    ids = np.full((len(sequences), length), pad_id, dtype=int)
    mask = np.zeros_like(ids)
    for i, seq in enumerate(sequences):
        clipped = seq[:length]
        ids[i, :len(clipped)] = clipped
        mask[i, :len(clipped)] = 1
    return ids, mask


def attention_bias(attention_mask):
    mask = np.asarray(attention_mask, dtype=float)[:, None, None, :]
    return (1.0 - mask) * -1e9


def count_padding(input_ids, pad_id=0):
    return int((np.asarray(input_ids) == pad_id).sum())
