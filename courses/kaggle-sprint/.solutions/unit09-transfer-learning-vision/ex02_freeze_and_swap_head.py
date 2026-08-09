from torch import nn
from torchvision.models import ResNet18_Weights, resnet18


def build_resnet18(num_classes, use_pretrained=False):
    weights = ResNet18_Weights.DEFAULT if use_pretrained else None
    model = resnet18(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def freeze_backbone(model):
    for name, parameter in model.named_parameters():
        parameter.requires_grad = name.startswith("fc.")
    return model


def unfreeze_last_block(model):
    for name, parameter in model.named_parameters():
        parameter.requires_grad = name.startswith(("layer4.", "fc."))
    return model


def count_trainable_parameters(model):
    return sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)
