# ex01: 未知カテゴリを壊さず数値へ変換する

import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from collections.abc import Sequence


# 学習列の各カテゴリが占める割合を辞書で返す
def fit_frequency_encoder(values: pd.Series) -> pd.Series:
    # TODO: 欠損も1カテゴリとして数え、値ごとの割合を作る
    raise NotImplementedError


# 学習済みfrequency表を適用し、未知カテゴリをunknown_valueで埋める
def apply_frequency_encoder(
    values: pd.Series, mapping: pd.Series, unknown_value: float = 0.0
) -> np.ndarray:
    # TODO: Series.mapで対応させ、欠損を指定値で埋めたfloat配列を返す
    raise NotImplementedError


# trainだけでOneHotEncoderをfitし、train/testを同じ列へ変換する
# 戻り値: (train_array, test_array, feature_names, fitted_encoder)
def one_hot_train_test(
    train: pd.DataFrame, test: pd.DataFrame, columns: Sequence[str]
) -> tuple[np.ndarray, np.ndarray, list[str], OneHotEncoder]:
    # TODO: handle_unknownを設定したencoderをtrainへfitして2表を変換する
    raise NotImplementedError
