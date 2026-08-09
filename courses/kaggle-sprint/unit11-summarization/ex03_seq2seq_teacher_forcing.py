"""ex03: 極小T5でbatch準備・teacher forcing学習・生成を行う。"""

import torch
from transformers import T5Config, T5ForConditionalGeneration


def build_tiny_t5(vocab_size=64, device=None):
    """ダウンロード不要の極小encoder-decoderを指定deviceへ作る。"""
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
    # TODO: 設定から生成モデルを作り、選んだdeviceへ移す
    raise NotImplementedError


def prepare_batch(input_ids, labels, pad_id=0, device=None):
    """attention maskを作り、labelのpadをloss無視値へ変える。"""
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    input_tensor = torch.as_tensor(input_ids, dtype=torch.long, device=device)
    label_tensor = torch.as_tensor(labels, dtype=torch.long, device=device).clone()
    # TODO: 入力maskとloss用labelを作り、3要素dictを返す
    raise NotImplementedError


def train_tiny_t5(model, batch, steps=3, learning_rate=0.01):
    """labels付きforwardでteacher forcing学習し、loss履歴を返す。"""
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    losses = []
    model.train()
    for _ in range(steps):
        optimizer.zero_grad()
        # TODO: forwardのlossを逆伝播して更新し、数値を履歴へ追加する
        raise NotImplementedError
    return losses


@torch.inference_mode()
def generate_with_t5(model, input_ids, attention_mask, max_new_tokens=4, num_beams=1):
    """同じdevice上でT5の自己回帰生成を行う。"""
    model.eval()
    # TODO: 入力・長さ上限・beam幅をgenerateへ渡す
    raise NotImplementedError
