# ex02_lgbm_early_stopping: LightGBM 4.xのcallback方式で学習を止める

import lightgbm as lgb
from lightgbm import LGBMRegressor


# 再現可能な価格回帰用LightGBMを作る
def make_regressor(
    n_estimators: int = 500, learning_rate: float = 0.05, random_state: int = 42
) -> LGBMRegressor:
    # TODO: 指定値と静かなログ設定を持つLGBMRegressorを返す
    raise NotImplementedError


# 検証データを監視し、改善が止まったらcallbackで早期終了する
def fit_with_early_stopping(
    model: LGBMRegressor,
    X_train: object,
    y_train: object,
    X_valid: object,
    y_valid: object,
    stopping_rounds: int = 20,
) -> LGBMRegressor:
    # TODO: 検証値を監視するLightGBM 4.x方式でfitする
    raise NotImplementedError


# 早期終了で得たbest_iteration_を木の本数にして全データで再学習する
def refit_best_iteration(
    fitted_model: LGBMRegressor, X_all: object, y_all: object
) -> LGBMRegressor:
    # TODO: 最良反復回数を引き継いだ新モデルを全件で学習する
    raise NotImplementedError
