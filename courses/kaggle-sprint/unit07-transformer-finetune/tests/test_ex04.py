from conftest import load_exercise
import torch

ex = load_exercise("ex04_capstone")


def _batch():
    return {
        "input_ids": torch.tensor([[2, 4, 5, 3], [2, 6, 7, 3]]),
        "attention_mask": torch.ones((2, 4), dtype=torch.long),
        "labels": torch.tensor([0, 0]),
    }


def _validation_batch():
    return {
        "input_ids": torch.tensor([[2, 4, 7, 3], [2, 5, 6, 3]]),
        "attention_mask": torch.ones((2, 4), dtype=torch.long),
        "labels": torch.tensor([0, 0]),
    }


# 設定した語彙数・分類数を持つ、実際の Transformers モデルかを確認する。
def test_build_tiny_bert_contract():
    model = ex.build_tiny_bert(16, 2, max_length=16)
    assert model.config.vocab_size == 16
    assert model.config.num_labels == 2
    assert model.classifier.out_features == 2


# forward が分類 loss と (batch, classes) の logits を返すことを確認する。
def test_real_forward_contract():
    model = ex.build_tiny_bert(16, 2, max_length=16)
    output = model(**_batch())
    assert output.loss.ndim == 0
    assert output.logits.shape == (2, 2)


# optimizer を通した fine-tuning で loss が改善し、最良 step を記録する。
def test_fine_tune_updates_real_model():
    torch.manual_seed(7)
    model = ex.build_tiny_bert(16, 2, max_length=16)
    before = model.classifier.weight.detach().clone()
    result = ex.fine_tune(model, _batch(), _validation_batch(), steps=6, learning_rate=0.03)
    assert len(result["validation_losses"]) == 6
    assert min(result["validation_losses"][1:]) < result["validation_losses"][0]
    assert 0 <= result["best_step"] < 6
    assert not torch.equal(before, model.classifier.weight)
    model.eval()
    with torch.inference_mode():
        restored_loss = float(model(**_validation_batch()).loss)
    assert abs(restored_loss - result["best_loss"]) < 1e-6


# inference_mode の予測結果がバッチごとの整数クラスになることを確認する。
def test_predict_shape_and_dtype():
    model = ex.build_tiny_bert(16, 2, max_length=16)
    batch = _batch()
    prediction = ex.predict(model, batch["input_ids"], batch["attention_mask"])
    assert prediction.shape == (2,)
    assert prediction.dtype == torch.long
