import numpy as np


def warmup_linear_lr(step, total_steps, warmup_steps, base_lr):
    if warmup_steps > 0 and step < warmup_steps:
        return base_lr * step / warmup_steps
    decay_steps = max(total_steps - warmup_steps, 1)
    return base_lr * max(0.0, (total_steps - step) / decay_steps)


def lr_series(total_steps, warmup_steps, base_lr):
    return np.array([warmup_linear_lr(step, total_steps, warmup_steps, base_lr) for step in range(total_steps)])


def effective_batch_size(micro_batch_size, accumulation_steps, device_count=1):
    return micro_batch_size * accumulation_steps * device_count
