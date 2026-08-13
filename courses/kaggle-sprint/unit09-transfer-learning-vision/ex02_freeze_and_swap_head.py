"""ex02: torchvision の ResNet18 で backbone 固定と head 交換を行う。"""

from torch import nn
from torchvision.models import ResNet18_Weights, resnet18


def build_resnet18(num_classes: int, use_pretrained: bool = False) -> nn.Module:
    """ResNet18 を作る。テスト時はダウンロード不要の weights=None を使う。"""
    weights = ResNet18_Weights.DEFAULT if use_pretrained else None
    model = resnet18(weights=weights)
    in_features = model.fc.in_features
    # TODO: 既存の分類 head を num_classes 出力の Linear へ交換する
    raise NotImplementedError


def freeze_backbone(model: nn.Module) -> nn.Module:
    """fc 以外を固定し、分類 head だけを学習可能にする。"""
    # TODO: named_parameters の名前を使って requires_grad を切り替える
    raise NotImplementedError


def unfreeze_last_block(model: nn.Module) -> nn.Module:
    """段階的 fine-tuning 用に layer4 と fc を学習可能にする。"""
    # TODO: layer4 と fc のパラメータだけ学習可能にする
    raise NotImplementedError


def count_trainable_parameters(model: nn.Module) -> int:
    """学習対象パラメータ数を返す。"""
    # TODO: requires_grad が True の numel だけを合計する
    raise NotImplementedError
