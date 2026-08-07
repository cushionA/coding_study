# ex04_capstone: 読み込みから提出ファイル検証までを1本につなぐ
# ex01(健全性)・ex02(アライメント検査/クリーニング)・ex03(ホールドアウト採点)で
# バラバラに書いた部品を、実際のコンペで毎回やる一連の流れとして統合する。
#
# 山場は「カテゴリ×状態の中央値」ベースラインの3段の退避チェーン:
#   (category, condition) の組で中央値が引けるならそれを使う
#   → 引けなければ category だけの中央値
#   → それも無ければ全体の中央値
# 「学習側に存在しない組み合わせ」は、ex03 で見た「検証側にしか無いカテゴリ」と同じ種類の問題である。

from pathlib import Path

import numpy as np
import pandas as pd


# RMSLE(ex03 と同じもの。ここでも完成品として与える)
def rmsle(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((np.log1p(y_pred) - np.log1p(y_true)) ** 2)))


# このファイルの場所から data/ ディレクトリを解決する。
# 学習者用ファイル(unit直下)から呼ばれても、.solutions/ 側の同名ファイルから呼ばれても動くようにする。
def _data_dir():
    here = Path(__file__).resolve()
    candidates = [
        here.parent / "data",  # 学習者用ファイル: unit01-.../ex04_capstone.py の隣
        here.parents[2] / "unit01-competition-anatomy" / "data" if len(here.parents) > 2 else None,  # .solutions/ 側
    ]
    for c in candidates:
        if c is not None and (c / "train.csv").exists():
            return c
    raise FileNotFoundError("train.csv が見つかりません。data/ ディレクトリの場所を確認してください。")


# train.csv / test.csv を読み込んで返す(完成済み。ここは書かなくてよい)
def load_data(data_dir=None):
    d = Path(data_dir) if data_dir is not None else _data_dir()
    train = pd.read_csv(d / "train.csv")
    test = pd.read_csv(d / "test.csv")
    return train, test


# df を学習側/検証側にランダム分割する(ex03 と同じロジック。ここでは完成品として与える)
def split_holdout(df, valid_frac=0.2, random_state=0):
    n_valid = int(len(df) * valid_frac)
    shuffled = df.sample(frac=1.0, random_state=random_state)
    valid_part = shuffled.iloc[:n_valid]
    train_part = shuffled.iloc[n_valid:]
    return train_part, valid_part


# train を掃除する: item_id を除いた完全重複行の削除 → price<=0 の削除 → price>1_000_000 の削除
# → views<0 を欠損に置換。戻り値は掃除後の DataFrame(行の順序は保持しなくてよい)。
def clean_train(df):
    feature_cols = [c for c in df.columns if c != "item_id"]
    df = df.drop_duplicates(subset=feature_cols)
    df = df[df["price"] > 0]
    df = df[df["price"] <= 1_000_000]
    df = df.copy()
    df.loc[df["views"] < 0, "views"] = np.nan
    return df


# train_part から (category_col, condition_col) の組ごとの price 中央値テーブルを作り、
# target_df の各行を「(category,condition) -> category -> 全体」の3段で退避しながら予測する。
# 戻り値: target_df と同じ長さ・同じ順序の予測値 np.ndarray
def category_condition_median_predict(
    train_part, target_df, category_col="category", condition_col="condition", target_col="price"
):
    pair_median = train_part.groupby([category_col, condition_col])[target_col].median()
    cat_median = train_part.groupby(category_col)[target_col].median()
    overall_median = float(train_part[target_col].median())

    preds = np.empty(len(target_df), dtype=float)
    for i, (_, row) in enumerate(target_df.iterrows()):
        key = (row[category_col], row[condition_col])
        if key in pair_median.index:
            preds[i] = float(pair_median.loc[key])
        elif row[category_col] in cat_median.index:
            preds[i] = float(cat_median.loc[row[category_col]])
        else:
            preds[i] = overall_median
    return preds


# 提出ファイルとして成立しているかを検査し、問題点の文字列リストを返す(空リスト = 合格)。
# 検査項目: 行数一致 / item_id集合一致 / 列名と順序 / 欠損ゼロ / 負値なし
def validate_submission(sub, test_df, id_col="item_id", pred_col="price"):
    problems = []
    if list(sub.columns) != [id_col, pred_col]:
        problems.append(f"列名または順序が違う: 期待 {[id_col, pred_col]} / 実際 {list(sub.columns)}")
    if len(sub) != len(test_df):
        problems.append(f"行数が違う: 期待 {len(test_df)} / 実際 {len(sub)}")
    if id_col in sub.columns and set(sub[id_col]) != set(test_df[id_col]):
        problems.append(f"{id_col} の集合が test と一致しない")
    if pred_col in sub.columns and sub[pred_col].isna().any():
        problems.append(f"{pred_col} に欠損がある: {int(sub[pred_col].isna().sum())} 件")
    if pred_col in sub.columns and (sub[pred_col].dropna() < 0).any():
        problems.append(f"{pred_col} に負値がある: {int((sub[pred_col].dropna() < 0).sum())} 件")
    return problems


# 読み込み → アライメント検査(簡易) → クリーニング → ホールドアウトで2ベースライン比較
# → 良い方で test を予測 → 提出の検証、までを1本につなぐ。
# 戻り値: 提出用 DataFrame(item_id, price の2列)
def run_capstone(train_df, test_df, valid_frac=0.2, random_state=0):
    train_clean = clean_train(train_df)

    tr_part, va_part = split_holdout(train_clean, valid_frac=valid_frac, random_state=random_state)

    # ベースライン1: 全体中央値
    overall_pred = np.full(len(va_part), float(tr_part["price"].median()))
    score_overall = rmsle(va_part["price"].to_numpy(dtype=float), overall_pred)

    # ベースライン2: カテゴリ×状態の中央値(3段の退避チェーン)
    cc_pred = category_condition_median_predict(tr_part, va_part)
    score_cc = rmsle(va_part["price"].to_numpy(dtype=float), cc_pred)

    # 良い方(RMSLEが小さい方)を、掃除後の train 全体で学習し直して test を予測する
    if score_cc <= score_overall:
        test_pred = category_condition_median_predict(train_clean, test_df)
    else:
        test_pred = np.full(len(test_df), float(train_clean["price"].median()))

    submission = pd.DataFrame({"item_id": test_df["item_id"], "price": test_pred})

    problems = validate_submission(submission, test_df)
    if problems:
        raise ValueError("提出ファイルの検証に失敗しました: " + " / ".join(problems))

    return submission
