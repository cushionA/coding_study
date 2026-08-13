"""ex01: PyTorch Dataset と DataLoader で画像バッチを作る。"""

from PIL import Image
from collections.abc import Callable, Sequence
from pathlib import Path
import torch
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import v2


class ImageDataset(Dataset):
    def __init__(
        self,
        paths: Sequence[str | Path],
        labels: Sequence[int],
        transform: Callable[[Image.Image], torch.Tensor] | None = None,
    ) -> None:
        self.paths = list(paths)
        self.labels = list(labels)
        self.transform = transform or v2.Compose(
            [v2.ToImage(), v2.ToDtype(torch.float32, scale=True)]
        )

    def __len__(self) -> int:
        # TODO: データセットが持つサンプル数を返す
        raise NotImplementedError

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        image = Image.open(self.paths[index]).convert("RGB")
        # TODO: transform を適用し、image と整数 label の辞書を返す
        raise NotImplementedError


def build_dataloader(
    dataset: Dataset, batch_size: int, shuffle: bool = False, seed: int = 42
) -> DataLoader:
    """再現可能な DataLoader を作る。"""
    generator = torch.Generator().manual_seed(seed)
    # TODO: dataset、batch_size、shuffle、generator を DataLoader へ渡す
    raise NotImplementedError
