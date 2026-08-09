import lightgbm as lgb
from lightgbm import LGBMRegressor


def make_regressor(n_estimators=500, learning_rate=0.05, random_state=42):
    return LGBMRegressor(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        random_state=random_state,
        verbosity=-1,
    )


def fit_with_early_stopping(model, X_train, y_train, X_valid, y_valid, stopping_rounds=20):
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_valid, y_valid)],
        eval_metric="rmse",
        callbacks=[lgb.early_stopping(stopping_rounds, verbose=False), lgb.log_evaluation(0)],
    )
    return model


def refit_best_iteration(fitted_model, X_all, y_all):
    params = fitted_model.get_params()
    params["n_estimators"] = int(fitted_model.best_iteration_)
    model = LGBMRegressor(**params)
    model.fit(X_all, y_all, callbacks=[lgb.log_evaluation(0)])
    return model
