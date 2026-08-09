from conftest import load_exercise
from torch import nn

ex = load_exercise("ex02_freeze_and_swap_head")


# 実際の torchvision ResNet18 と指定クラス数の Linear head か確認する。
def test_build_resnet18_replaces_head():
    model = ex.build_resnet18(num_classes=4)
    assert isinstance(model.fc, nn.Linear)
    assert model.fc.out_features == 4
    assert hasattr(model, "layer4")


# backbone 固定後に fc だけが学習対象か確認する。
def test_freeze_backbone_only_head_trainable():
    model = ex.freeze_backbone(ex.build_resnet18(3))
    trainable = [name for name, p in model.named_parameters() if p.requires_grad]
    assert trainable == ["fc.weight", "fc.bias"]


# staged fine-tuning では最終 block と head が学習対象か確認する。
def test_unfreeze_last_block():
    model = ex.unfreeze_last_block(ex.freeze_backbone(ex.build_resnet18(3)))
    trainable = [name for name, p in model.named_parameters() if p.requires_grad]
    assert any(name.startswith("layer4.") for name in trainable)
    assert all(name.startswith(("layer4.", "fc.")) for name in trainable)


# requires_grad に基づく学習対象パラメータ数か確認する。
def test_count_trainable_parameters():
    model = ex.freeze_backbone(ex.build_resnet18(3))
    assert ex.count_trainable_parameters(model) == model.fc.weight.numel() + model.fc.bias.numel()
