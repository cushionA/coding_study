"""unit09 の主張「小データではスクラッチ学習より転移学習が強い」をオフラインで検証する。

外部の事前学習済み重みは組織のエグレスポリシーで取得できない
(download.pytorch.org / huggingface.co ともに 403)。
そこで「事前学習」を自前で作る:

  1. unit08 とは別のクラス(8種の図形)で、同じ描画パイプライン(背景の散らかり・遮蔽・
     回転・スケール)の合成画像を 3000 枚作る = ImageNet の代役(pretext タスク)
  2. その 8 クラス分類で CNN backbone を学習する = 事前学習
  3. backbone を凍結して unit08 の 5 クラスタスクの特徴抽出器として使い、
     線形ヘッドだけを学習する = 転移学習(特徴抽出)
  4. 全層を微調整する版もやる = 転移学習(ファインチューニング)
  5. HOG / スクラッチCNN と比較する

評価は unit08 と同じ GroupKFold(4, groups=product_key)。
"""

import time

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold
from torch.utils.data import DataLoader, TensorDataset

SIZE = 64
D = Path("courses/kaggle-sprint/unit08-image-and-pattern-basics/data")
rng = np.random.default_rng(1234)

PRETEXT_CLASSES = ["triangle", "star", "cross", "ring", "diamond", "arrow", "hexagon", "bar"]
PALETTE = [(200, 80, 70), (70, 120, 190), (230, 190, 80), (90, 160, 120),
           (140, 100, 180), (120, 120, 120), (60, 180, 180), (220, 140, 60)]


def canvas():
    img = np.full((SIZE, SIZE, 3), float(rng.integers(180, 245)))
    img += rng.normal(0, 3, img.shape)
    for _ in range(int(rng.integers(2, 6))):
        h, w = rng.integers(4, 16, 2)
        y0, x0 = rng.integers(0, SIZE - 4, 2)
        img[y0:y0 + h, x0:x0 + w] = img[y0:y0 + h, x0:x0 + w] * 0.35 + rng.uniform(120, 250, 3) * 0.65
    return img


def draw_pretext(cls, color):
    img = canvas()
    y, x = np.mgrid[0:SIZE, 0:SIZE]
    y = y.astype(float); x = x.astype(float)
    cy, cx = rng.uniform(22, 42, 2)
    s = rng.uniform(0.72, 1.20)
    th = rng.uniform(-0.45, 0.45)
    yr = (y - cy) * np.cos(th) - (x - cx) * np.sin(th)
    xr = (y - cy) * np.sin(th) + (x - cx) * np.cos(th)
    r = np.sqrt(yr ** 2 + xr ** 2)
    ang = np.arctan2(yr, xr)

    if cls == "triangle":
        m = (yr < 12 * s) & (yr > -12 * s) & (np.abs(xr) < (12 * s - yr) * 0.6)
    elif cls == "star":
        m = r < (10 + 5 * np.cos(5 * ang)) * s
    elif cls == "cross":
        m = ((np.abs(yr) < 5 * s) & (np.abs(xr) < 17 * s)) | ((np.abs(xr) < 5 * s) & (np.abs(yr) < 17 * s))
    elif cls == "ring":
        m = (r < 17 * s) & (r > 10 * s)
    elif cls == "diamond":
        m = (np.abs(yr) + np.abs(xr)) < 15 * s
    elif cls == "arrow":
        m = ((np.abs(yr) < 4 * s) & (xr < 8 * s) & (xr > -15 * s)) | \
            ((np.abs(yr) < (12 * s - (xr - 8 * s) * 1.5)) & (xr > 8 * s) & (xr < 16 * s))
    elif cls == "hexagon":
        m = (r < 15 * s) & (np.abs(yr) < 13 * s)
    else:  # bar
        m = (np.abs(yr) < 4 * s) & (np.abs(xr) < 18 * s)

    img[m] = np.array(color, dtype=float)
    img[m & (r < 6 * s)] = np.array(color, dtype=float) * 0.6
    if rng.random() < 0.30:                                   # 遮蔽
        h, w = rng.integers(8, 18, 2)
        y0, x0 = rng.integers(10, SIZE - 22, 2)
        img[y0:y0 + h, x0:x0 + w] = rng.uniform(150, 240, 3)
    return np.clip(img, 0, 255)


def build_backbone():
    return nn.Sequential(
        nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
        nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
        nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
        nn.AdaptiveAvgPool2d(1), nn.Flatten(),
    )


def train(model, X, Y, epochs, lr=2e-3, augment=True):
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    sch = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    dl = DataLoader(TensorDataset(X, Y), batch_size=64, shuffle=True)
    for _ in range(epochs):
        model.train()
        for xb, yb in dl:
            if augment:
                if torch.rand(1) < 0.5:
                    xb = torch.flip(xb, [3])
                xb = xb + torch.randn_like(xb) * 0.03
            opt.zero_grad()
            nn.functional.cross_entropy(model(xb), yb).backward()
            opt.step()
        sch.step()
    return model


def main():
    t0 = time.time()

    # ---- 1. pretext データ(= ImageNet の代役)----
    n_pre = 3000
    Xp = np.empty((n_pre, SIZE, SIZE, 3), dtype=np.uint8)
    Yp = np.empty(n_pre, dtype=np.int64)
    for i in range(n_pre):
        c = int(rng.integers(0, len(PRETEXT_CLASSES)))
        col = PALETTE[int(rng.integers(0, len(PALETTE)))]
        Xp[i] = draw_pretext(PRETEXT_CLASSES[c], col).astype(np.uint8)
        Yp[i] = c
    Xp_t = torch.tensor(Xp.transpose(0, 3, 1, 2) / 255.0, dtype=torch.float32)
    Yp_t = torch.tensor(Yp)
    print(f"pretext データ: {Xp.shape}, {len(PRETEXT_CLASSES)}クラス  ({time.time()-t0:.0f}s)")

    # ---- 2. backbone を pretext で学習(= 事前学習)----
    torch.manual_seed(0)
    backbone = build_backbone()
    pre_model = nn.Sequential(backbone, nn.Linear(128, len(PRETEXT_CLASSES)))
    train(pre_model, Xp_t, Yp_t, epochs=25)
    pre_model.eval()
    with torch.no_grad():
        acc = (pre_model(Xp_t).argmax(1) == Yp_t).float().mean().item()
    print(f"事前学習(pretext 8クラス)の学習データ accuracy = {acc:.4f}  ({time.time()-t0:.0f}s)")
    pretrained_state = {k: v.clone() for k, v in backbone.state_dict().items()}

    # ---- 3. 本番タスク(unit08 の 5 クラス)----
    tr = pd.read_csv(D / "train.csv")
    imgs = np.stack([np.asarray(Image.open(D / "images/train" / i)) for i in tr["image_id"]])
    labs = sorted(tr["label"].unique())
    li = {l: i for i, l in enumerate(labs)}
    X = torch.tensor(imgs.transpose(0, 3, 1, 2) / 255.0, dtype=torch.float32)
    Y = torch.tensor([li[l] for l in tr["label"]])
    groups = tr["product_key"]
    gkf = GroupKFold(4)

    # (a) 転移学習: backbone 凍結 + 線形ヘッド
    bb = build_backbone(); bb.load_state_dict(pretrained_state); bb.eval()
    with torch.no_grad():
        feats = bb(X).numpy()
    accs = []
    for a, b in gkf.split(feats, Y, groups):
        clf = LogisticRegression(max_iter=3000, C=1.0).fit(feats[a], Y.numpy()[a])
        accs.append((clf.predict(feats[b]) == Y.numpy()[b]).mean())
    frozen = float(np.mean(accs))
    print(f"[転移学習/凍結+線形ヘッド] accuracy = {frozen:.4f}  ({time.time()-t0:.0f}s)")

    # (b) 転移学習: 全層ファインチューニング
    accs = []
    for a, b in gkf.split(X, Y, groups):
        torch.manual_seed(0)
        bb = build_backbone(); bb.load_state_dict(pretrained_state)
        m = nn.Sequential(bb, nn.Dropout(0.2), nn.Linear(128, 5))
        train(m, X[a], Y[a], epochs=30, lr=1e-3)
        m.eval()
        with torch.no_grad():
            accs.append((m(X[b]).argmax(1) == Y[b]).float().mean().item())
    finetune = float(np.mean(accs))
    print(f"[転移学習/全層FT]        accuracy = {finetune:.4f}  ({time.time()-t0:.0f}s)")

    # (c) スクラッチ(同じ構造・同じエポック数、重みだけランダム初期化)
    accs = []
    for a, b in gkf.split(X, Y, groups):
        torch.manual_seed(0)
        m = nn.Sequential(build_backbone(), nn.Dropout(0.2), nn.Linear(128, 5))
        train(m, X[a], Y[a], epochs=30, lr=1e-3)
        m.eval()
        with torch.no_grad():
            accs.append((m(X[b]).argmax(1) == Y[b]).float().mean().item())
    scratch = float(np.mean(accs))
    print(f"[スクラッチCNN/同条件]   accuracy = {scratch:.4f}  ({time.time()-t0:.0f}s)")

    print("\n================ まとめ ================")
    print(f"  色ヒストグラムのみ + LinearSVC   0.3533  (既測)")
    print(f"  HOG + LinearSVC                  0.7840  (既測)")
    print(f"  スクラッチCNN(同条件)           {scratch:.4f}")
    print(f"  転移学習(凍結 + 線形ヘッド)     {frozen:.4f}")
    print(f"  転移学習(全層ファインチューニング){finetune:.4f}")
    print(f"\n  転移 - スクラッチ = {finetune - scratch:+.4f}(全層FT) / {frozen - scratch:+.4f}(凍結)")


if __name__ == "__main__":
    main()
