from conftest import load_exercise
import numpy as np
from PIL import Image
import torch

ex = load_exercise("ex01_dataset_dataloader")


def _files(tmp_path):
    paths = []
    for index, value in enumerate([0, 64, 255]):
        path = tmp_path / f"{index}.png"
        Image.fromarray(np.full((4, 5, 3), value, dtype=np.uint8)).save(path)
        paths.append(path)
    return paths


# Dataset が PyTorch の CHW float tensor と整数ラベルを返すか確認する。
def test_dataset_contract(tmp_path):
    dataset = ex.ImageDataset(_files(tmp_path), [0, 1, 2])
    sample = dataset[1]
    assert len(dataset) == 3
    assert sample["image"].shape == (3, 4, 5)
    assert sample["image"].dtype == torch.float32
    assert sample["label"] == 1


# 注入した transform が実際に __getitem__ で利用されるか確認する。
def test_dataset_transform_injection(tmp_path):
    dataset = ex.ImageDataset(
        _files(tmp_path),
        [0, 1, 2],
        transform=lambda _image: torch.ones(3, 2, 2),
    )
    assert torch.equal(dataset[0]["image"], torch.ones(3, 2, 2))


# DataLoader が辞書を自動 collate して BCHW バッチへ変換するか確認する。
def test_dataloader_batch_shape(tmp_path):
    dataset = ex.ImageDataset(_files(tmp_path), [0, 1, 2])
    batch = next(iter(ex.build_dataloader(dataset, batch_size=2)))
    assert batch["image"].shape == (2, 3, 4, 5)
    assert batch["label"].shape == (2,)


# seed が同じ shuffle は同じラベル順になるか確認する。
def test_dataloader_shuffle_reproducible(tmp_path):
    dataset = ex.ImageDataset(_files(tmp_path), [0, 1, 2])
    first = torch.cat([b["label"] for b in ex.build_dataloader(dataset, 1, True, 9)])
    second = torch.cat([b["label"] for b in ex.build_dataloader(dataset, 1, True, 9)])
    assert torch.equal(first, second)
