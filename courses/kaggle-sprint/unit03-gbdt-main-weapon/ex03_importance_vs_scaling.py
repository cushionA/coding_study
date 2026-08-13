# ex03_importance_vs_scaling: 木の重要度を読み、必要なモデルだけ標準化する

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from collections.abc import Sequence
from typing import Any


# feature_importances_を大きい順のDataFrameにする
# 列: feature, importance, share
def importance_table(model: Any, feature_names: Sequence[str]) -> pd.DataFrame:
    # TODO: 名前と重要度を対応させ、合計に占める割合を加えて降順にする
    raise NotImplementedError


# scalerをtrainだけでfitし、train/validを同じ変換で標準化する
# 戻り値: (scaled_train, scaled_valid, fitted_scaler)
def scale_train_valid(
    X_train: np.ndarray, X_valid: np.ndarray
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    # TODO: validの情報を使わず、2つを同じ基準で標準化する
    raise NotImplementedError
