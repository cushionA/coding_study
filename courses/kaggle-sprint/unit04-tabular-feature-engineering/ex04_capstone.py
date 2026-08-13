# ex04_capstone: 前処理とモデルを一体化し、foldごとにfitする

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from collections.abc import Sequence
from typing import Any


# 数値列とカテゴリ列の前処理をColumnTransformerとして返す
def make_preprocessor(
    numeric_cols: Sequence[str], categorical_cols: Sequence[str]
) -> ColumnTransformer:
    # TODO: 数値列とカテゴリ列に適した前処理を、列別に組み立てる
    raise NotImplementedError


# 前処理とestimatorを1本のPipelineへまとめる
def make_pipeline(
    estimator: Any, numeric_cols: Sequence[str], categorical_cols: Sequence[str]
) -> Pipeline:
    # TODO: preprocessとmodelの2段Pipelineを返す
    raise NotImplementedError


# Pipelineをfoldごとに複製・fitし、全行ぶんのOOF予測を返す
def make_oof_predictions(
    pipeline: Pipeline,
    X: pd.DataFrame,
    y: np.ndarray,
    splitter: Any,
    groups: np.ndarray | None = None,
) -> np.ndarray:
    # TODO: 各foldの学習済みPipelineで、そのfoldの検証行だけを予測する
    raise NotImplementedError
