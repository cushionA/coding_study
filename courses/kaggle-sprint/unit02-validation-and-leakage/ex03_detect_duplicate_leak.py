# ex03_detect_duplicate_leak: 良すぎる検証値を喜ぶ前に、特徴と重複を監査する

import numpy as np
import pandas as pd


# 検証側のentityのうち、学習側に一度も無い行の割合を返す
def unknown_entity_rate(
    entities: np.ndarray, train_idx: np.ndarray, valid_idx: np.ndarray
) -> float:
    # TODO: 学習側の既知集合を作り、検証側の各行が未知かを平均する
    raise NotImplementedError


# trainにしか無い列から目的変数を除き、並べ替えたリストを返す
def train_only_columns(
    train: pd.DataFrame, test: pd.DataFrame, target_col: str
) -> list[str]:
    # TODO: 列名集合の差を使う
    raise NotImplementedError


# 定価と割引率から価格を復元する
def reconstruct_price(list_price: np.ndarray, discount_rate: np.ndarray) -> np.ndarray:
    # TODO: 定価と割引率の既知の関係を、配列全体へ適用する
    raise NotImplementedError
