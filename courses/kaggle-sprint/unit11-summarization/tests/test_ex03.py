from conftest import load_exercise
import torch

ex = load_exercise("ex03_seq2seq_teacher_forcing")
torch.set_num_threads(1)


def _batch():
    return ex.prepare_batch(
        [[5, 6, 1, 0], [7, 8, 1, 0]],
        [[9, 10, 1, 0], [11, 12, 1, 0]],
        device=torch.device("cpu"),
    )


# 極小T5が実encoder-decoderとしてCPUへ構築されるか確認する。
def test_build_tiny_t5_contract():
    model = ex.build_tiny_t5(vocab_size=32, device=torch.device("cpu"))
    assert model.config.vocab_size == 32
    assert model.config.is_encoder_decoder is True
    assert next(model.parameters()).device.type == "cpu"


# pad位置がattention対象外かつloss対象外になるbatchか確認する。
def test_prepare_batch_masks_padding():
    batch = _batch()
    assert batch["attention_mask"].tolist() == [[1, 1, 1, 0], [1, 1, 1, 0]]
    assert batch["labels"][:, -1].tolist() == [-100, -100]
    assert all(value.device.type == "cpu" for value in batch.values())


# labels付きforwardの実学習で重みが変わりlossが改善するか確認する。
def test_train_tiny_t5_updates_and_improves():
    torch.manual_seed(4)
    model = ex.build_tiny_t5(vocab_size=32, device=torch.device("cpu"))
    before = model.lm_head.weight.detach().clone()
    losses = ex.train_tiny_t5(model, _batch(), steps=4, learning_rate=0.01)
    assert len(losses) == 4
    assert losses[-1] < losses[0]
    assert not torch.equal(before, model.lm_head.weight)


# generateがbatch数とmax_new_tokens上限を守るか確認する。
def test_generate_with_t5_contract():
    model = ex.build_tiny_t5(vocab_size=32, device=torch.device("cpu"))
    batch = _batch()
    generated = ex.generate_with_t5(model, batch["input_ids"], batch["attention_mask"], 3, 1)
    assert generated.shape[0] == 2
    assert generated.shape[1] <= 4


# beam幅を変えても入力と出力が同じdeviceに保たれるか確認する。
def test_generate_device_independent():
    model = ex.build_tiny_t5(vocab_size=32, device=torch.device("cpu"))
    batch = _batch()
    generated = ex.generate_with_t5(model, batch["input_ids"], batch["attention_mask"], 2, 2)
    assert generated.device.type == "cpu"
