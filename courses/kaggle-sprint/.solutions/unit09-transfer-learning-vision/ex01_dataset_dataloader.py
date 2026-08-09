from PIL import Image
import torch
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import v2


class ImageDataset(Dataset):
    def __init__(self, paths, labels, transform=None):
        self.paths = list(paths)
        self.labels = list(labels)
        self.transform = transform or v2.Compose(
            [v2.ToImage(), v2.ToDtype(torch.float32, scale=True)]
        )

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, index):
        image = Image.open(self.paths[index]).convert("RGB")
        return {"image": self.transform(image), "label": int(self.labels[index])}


def build_dataloader(dataset, batch_size, shuffle=False, seed=42):
    generator = torch.Generator().manual_seed(seed)
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        generator=generator,
    )
