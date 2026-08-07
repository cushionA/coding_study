"""unit08 / unit09 の合成画像データを生成する(seed固定・再実行で同一結果)。

題材: 出品写真から商品カテゴリ5クラスを当てる画像分類 + 同一商品写真の重複検出。

unit08(画像とパターン認識の基礎)と unit09(転移学習)で同じデータを使う。

  【クラス】
    plate(丸皿) / book(本) / bottle(ボトル) / shirt(シャツ) / shoe(靴)
    形と色の組み合わせで判別できるが、色はクラス間で共有されるため
    「色だけ」では解けない(形の情報が要る)ようにしてある。

  【重複画像の仕込み ← unit08 の重複検出の教材】
    同一商品(same product_key)の写真が、次の変形を受けて複数枚存在する:
      - リサイズ(解像度が違う)
      - 余白(パディング)の追加
      - 隅のロゴ透かし
      - 明るさ・コントラストのずれ
      - 軽いノイズ
    「ピクセルが1つも一致しないのに同じ商品」という状況を作る。
    バイト比較やピクセル完全一致では検出できず、リサイズ+正規化してからの
    距離やハッシュが必要になる。

  【難しさの調整】
    - 背景の明るさがランダムに変わる(前処理での正規化の動機)
    - 背景に散らかり(矩形のノイズ)が入る。実際の出品写真は背景が汚い
    - 物体の位置・大きさ・回転が振れる(±25度、大きさ0.72〜1.20倍)。
      回転を±25度に抑えているのは、これ以上振ると回転した bottle が book と同じ
      横長矩形になり、クラスの区別そのものが壊れるため(実測で確認済み)。
    - 30%の画像で物体の一部が隠れる(手・値札・他商品の写り込み)
    - 色はクラス間で共有されるため「色だけ」では解けない(形の情報が要る)

  【画像形式】
    64x64 RGB の PNG。images/train/ と images/test/ に配置し、
    ラベルは train.csv / test.csv に持たせる(Kaggleの画像コンペと同じ形)。

実行: python courses/kaggle-sprint/unit08-image-and-pattern-basics/data/make_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image

SEED = 20260808
OUT = Path(__file__).resolve().parent
SIZE = 64
CLASSES = ["plate", "book", "bottle", "shirt", "shoe"]
PALETTE = [(210, 70, 60), (60, 110, 200), (240, 200, 70), (80, 170, 110), (150, 90, 190)]


def _canvas(rng):
    bg = int(rng.integers(180, 245))
    img = np.full((SIZE, SIZE, 3), bg, dtype=np.float64)
    img += rng.normal(0, 3, img.shape)
    return img


def _yx():
    y, x = np.mgrid[0:SIZE, 0:SIZE]
    return y.astype(float), x.astype(float)


def _clutter(rng, img):
    """背景に散らかりを足す。実際の出品写真は背景が汚い。
    これが無いと古典特徴だけでほぼ解けてしまい、転移学習の出番が無くなる。"""
    for _ in range(int(rng.integers(2, 6))):
        h, w = rng.integers(4, 16, 2)
        y0, x0 = rng.integers(0, SIZE - 4, 2)
        c = rng.uniform(120, 250, 3)
        img[y0:y0 + h, x0:x0 + w] = img[y0:y0 + h, x0:x0 + w] * 0.35 + c * 0.65
    return img


def _occlude(rng, img):
    """物体の一部を隠す(手・値札・他の商品が写り込む状況)"""
    if rng.random() < 0.30:
        h, w = rng.integers(8, 18, 2)
        y0, x0 = rng.integers(10, SIZE - 22, 2)
        img[y0:y0 + h, x0:x0 + w] = rng.uniform(150, 240, 3)
    return img


def _draw(rng, cls, color):
    """クラスごとの形をベタ塗りで描く。位置・大きさ・回転が毎回振れる。"""
    img = _clutter(rng, _canvas(rng))
    y, x = _yx()
    cy, cx = rng.uniform(22, 42, 2)
    s = rng.uniform(0.72, 1.20)
    # 回転は ±25度 に留める。これ以上振ると、回転したbottleがbookと同じ横長矩形になり
    # クラスの区別そのものが壊れる(実測で CNN が HOG を超えられなくなった)。
    th = rng.uniform(-0.45, 0.45)
    yr = (y - cy) * np.cos(th) - (x - cx) * np.sin(th)
    xr = (y - cy) * np.sin(th) + (x - cx) * np.cos(th)

    if cls == "plate":                       # 円
        mask = (yr ** 2 + xr ** 2) < (18 * s) ** 2
        inner = (yr ** 2 + xr ** 2) < (11 * s) ** 2
    elif cls == "book":                      # 横長の矩形 + 背表紙の線
        mask = (np.abs(yr) < 13 * s) & (np.abs(xr) < 18 * s)
        inner = (np.abs(yr) < 13 * s) & (np.abs(xr + 12 * s) < 2.5 * s)
    elif cls == "bottle":                    # 縦長 + 首
        body = (np.abs(xr) < 7 * s) & (yr > -6 * s) & (yr < 19 * s)
        neck = (np.abs(xr) < 3 * s) & (yr > -19 * s) & (yr <= -6 * s)
        mask = body | neck
        inner = (np.abs(xr) < 7 * s) & (np.abs(yr - 4 * s) < 3 * s)
    elif cls == "shirt":                     # T字(胴 + 袖)
        body = (np.abs(xr) < 10 * s) & (yr > -8 * s) & (yr < 16 * s)
        sleeve = (np.abs(yr + 4 * s) < 5 * s) & (np.abs(xr) < 19 * s)
        mask = body | sleeve
        inner = (np.abs(xr) < 3 * s) & (np.abs(yr + 6 * s) < 3 * s)
    else:                                    # shoe: 楕円 + つま先の張り出し
        mask = ((yr / (8 * s)) ** 2 + (xr / (17 * s)) ** 2) < 1
        toe = ((yr - 4 * s) / (5 * s)) ** 2 + ((xr - 12 * s) / (7 * s)) ** 2 < 1
        mask = mask | toe
        inner = (np.abs(yr + 3 * s) < 2 * s) & (np.abs(xr) < 10 * s)

    img[mask] = np.array(color, dtype=float)
    shade = np.array(color, dtype=float) * 0.65
    img[inner] = shade
    return _occlude(rng, img)


def _variant(rng, base):
    """同一商品の別写真を作る(重複検出の教材用)。ピクセルは一致しなくなる。"""
    img = base.copy()
    kind = rng.integers(0, 5)
    if kind == 0:                                   # リサイズして戻す(解像度が違う写真)
        k = int(rng.choice([28, 40, 96]))
        im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((k, k))
        img = np.asarray(im.resize((SIZE, SIZE)), dtype=float)
    elif kind == 1:                                 # 余白を足す(縮小して中央に置く)
        pad = int(rng.integers(6, 14))
        im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((SIZE - 2 * pad,) * 2)
        out = np.full((SIZE, SIZE, 3), 250.0)
        out[pad:SIZE - pad, pad:SIZE - pad] = np.asarray(im, dtype=float)
        img = out
    elif kind == 2:                                 # 隅にロゴ透かし
        img[4:14, 4:20] = img[4:14, 4:20] * 0.45 + 110
    elif kind == 3:                                 # 明るさ・コントラストのずれ
        img = (img - 128) * rng.uniform(0.75, 1.3) + 128 + rng.uniform(-25, 25)
    else:                                           # ノイズ
        img = img + rng.normal(0, 12, img.shape)
    return img


def _save(img, path):
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(path)


def main():
    rng = np.random.default_rng(SEED)
    for split in ("train", "test"):
        (OUT / "images" / split).mkdir(parents=True, exist_ok=True)
        for f in (OUT / "images" / split).glob("*.png"):
            f.unlink()

    rows = {"train": [], "test": []}
    pid = 0
    n_products = {"train": 500, "test": 150}

    for split, n_prod in n_products.items():
        for _ in range(n_prod):
            cls = CLASSES[int(rng.integers(0, len(CLASSES)))]
            color = PALETTE[int(rng.integers(0, len(PALETTE)))]
            base = _draw(rng, cls, color)
            key = f"PR{pid:04d}"
            pid += 1

            n_photo = int(rng.choice([1, 2, 3], p=[0.55, 0.30, 0.15]))
            for j in range(n_photo):
                img = base if j == 0 else _variant(rng, base)
                name = f"{key}_{j}.png"
                _save(img, OUT / "images" / split / name)
                rows[split].append({
                    "image_id": name,
                    "product_key": key,
                    "label": cls,
                    "is_variant": int(j > 0),
                })

    train = pd.DataFrame(rows["train"]).sample(frac=1.0, random_state=SEED).reset_index(drop=True)
    test = pd.DataFrame(rows["test"]).sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    answer = test[["image_id", "label", "product_key"]].copy()
    test_public = test.drop(columns=["label"])

    train.to_csv(OUT / "train.csv", index=False)
    test_public.to_csv(OUT / "test.csv", index=False)
    pd.DataFrame({"image_id": test_public["image_id"],
                  "label": train["label"].mode()[0]}).to_csv(OUT / "sample_submission.csv", index=False)

    answer_dir = OUT.parents[1] / ".solutions" / OUT.parent.name
    answer_dir.mkdir(parents=True, exist_ok=True)
    answer.to_csv(answer_dir / "_answer.csv", index=False)

    print("train", train.shape, "test", test_public.shape)
    print("クラス分布(train):", train["label"].value_counts().to_dict())
    print("同一商品の複数写真をもつ商品数(train):",
          int((train["product_key"].value_counts() >= 2).sum()), "/", train["product_key"].nunique())
    print("変形写真の枚数(train):", int(train["is_variant"].sum()))
    im = Image.open(OUT / "images" / "train" / train["image_id"].iat[0])
    a = np.asarray(im)
    print("画像1枚の形:", a.shape, "dtype:", a.dtype, "値域:", a.min(), "-", a.max())
    tot = sum(f.stat().st_size for f in (OUT / "images").rglob("*.png"))
    print(f"PNG合計: {tot/1024/1024:.2f} MB / {len(list((OUT/'images').rglob('*.png')))} 枚")


if __name__ == "__main__":
    main()
