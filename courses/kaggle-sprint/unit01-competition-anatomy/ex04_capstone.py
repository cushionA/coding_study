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
from collections.abc import Sequence

import numpy as np
import pandas as pd


# RMSLE(ex03 と同じもの。ここでも完成品として与える)
def rmsle(
    y_true: Sequence[float] | np.ndarray, y_pred: Sequence[float] | np.ndarray
) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((np.log1p(y_pred) - np.log1p(y_true)) ** 2)))


# このファイルの場所から data/ ディレクトリを解決する(完成済み)。
# 学習者用ファイル(unit直下)から呼ばれても、.solutions/ 側の同名ファイルから呼ばれても動くようにしてある。
def _data_dir() -> Path:
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
def load_data(data_dir: str | Path | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    d = Path(data_dir) if data_dir is not None else _data_dir()
    train = pd.read_csv(d / "train.csv")
    test = pd.read_csv(d / "test.csv")
    return train, test


# df を学習側/検証側にランダム分割する(ex03 と同じロジック。ここでは完成品として与える)
def split_holdout(
    df: pd.DataFrame, valid_frac: float = 0.2, random_state: int = 0
) -> tuple[pd.DataFrame, pd.DataFrame]:
    n_valid = int(len(df) * valid_frac)
    shuffled = df.sample(frac=1.0, random_state=random_state)
    valid_part = shuffled.iloc[:n_valid]
    train_part = shuffled.iloc[n_valid:]
    return train_part, valid_part


# train を掃除する: item_id を除いた完全重複行の削除 → price<=0 の削除 → price>1_000_000 の削除
# → views<0 を欠損に置換。戻り値は掃除後の DataFrame(行の順序は保持しなくてよい)。
def clean_train(df: pd.DataFrame) -> pd.DataFrame:
    # TODO: ex02 でやった4ステップを順番に適用する(ここでは log は不要、掃除後の df だけ返す)
    unique = df.drop_duplicates(subset=[col for col in df.columns if col != "item_id"])
    filterd =  unique[(unique["price"] > 0) & (unique["price"] <= 1_000_000)]
    filterd.loc[filterd["views"] < 0,"views"] = pd.NA
    return filterd


# train_part から (category_col, condition_col) の組ごとの price 中央値テーブルを作り、
# target_df の各行を「(category,condition) -> category -> 全体」の3段で退避しながら予測する。
# 戻り値: target_df と同じ長さ・同じ順序の予測値 np.ndarray
def category_condition_median_predict(
    train_part: pd.DataFrame,
    target_df: pd.DataFrame,
    category_col: str = "category",
    condition_col: str = "condition",
    target_col: str = "price",
) -> np.ndarray:
    # TODO: train_part から (category,condition) ごとの中央値・category ごとの中央値・全体中央値の
    #       3種類を作る。target_df を1行ずつ見て、この順で最初に見つかったものを予測値にする(ヒント参照)。
    first ={}
    second = {}
    for cat in train_part[category_col].unique():
        part = train_part[train_part[category_col] == cat]
        second[cat] = part[target_col].median()
        for cond in part[condition_col].unique():
            first[(cat,cond)] = part.loc[part[condition_col] == cond,target_col].median()

    median = train_part[target_col].median()

    ans = []
    for i,row in target_df.iterrows():
        v = first.get((row[category_col], row[condition_col]), np.nan)
        v = v if np.isnan(v)==False else second.get(row[category_col], np.nan)
        v = v if np.isnan(v)==False else median
        ans.append(v)
    return np.array(ans)

# 提出ファイルとして成立しているかを検査し、問題点の文字列リストを返す(空リスト = 合格)。
# 検査項目:
#   - sub と test_df の行数が一致する
#   - sub[id_col] と test_df[id_col] のID集合が一致する
#   - sub の列名と順序が [id_col, pred_col] と完全一致する
#   - sub の全列に欠損がない
#   - sub[pred_col] に負値がない
def validate_submission(
    sub: pd.DataFrame,
    test_df: pd.DataFrame,
    id_col: str = "item_id",
    pred_col: str = "price",
) -> list[str]:
    # TODO: 5項目それぞれをチェックし、問題があれば説明文字列を problems に追加していく
    problems = []
    if len(sub) != len(test_df):
        problems.append("行数不一致")
    if set(sub[id_col]) != set(test_df[id_col]):
        problems.append("item_id集合不一致")
    if list(sub.columns) != [id_col, pred_col]:
        problems.append("列名と順序不一致")
    if sub.isna().any().any():
        problems.append("欠損アリ")
    if sub[pred_col].min() < 0:
        problems.append("負値アリ")   

    return problems

# クリーニング → ホールドアウトで2ベースライン比較 → 良い方で test を予測
# → 提出の検証、までを1本につなぐ。読み込みとアライメント検査はこの関数の対象外。
# 戻り値: 提出用 DataFrame(item_id, price の2列)
def run_capstone(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    valid_frac: float = 0.2,
    random_state: int = 0,
) -> pd.DataFrame:
    # TODO: 次の手順で1本につなぐ
    #   1. clean_train で train を掃除する
    #   2. split_holdout で学習側/検証側に分ける
    #   3. train_part の全体中央値を valid_part の行数だけ並べた予測と、
    #      category_condition_median_predict(train_part, valid_part) の予測を作る。
    #      それぞれを valid_part["price"] と rmsle で比較する
    #   4. rmsle が小さい方を採用する(同点ならどちらでもよい)。全体中央値を採用した場合は
    #      cleaned 全体の中央値を test_df の行数だけ並べる。カテゴリ×状態を採用した場合は
    #      category_condition_median_predict(cleaned, test_df) で統計量を再計算して予測する
    #   5. test_df["item_id"] と予測値から、列名と順序が ["item_id", "price"] の
    #      DataFrame を作る。行順は test_df と同じにする
    #   6. validate_submission に通し、問題一覧が空でなければ、その内容を含む
    #      ValueError を送出する。問題がなければ提出用 DataFrame を返す
    cleaned = clean_train(train_df)
    (train,valid) = split_holdout(cleaned,valid_frac,random_state)
    pred_1 = np.full(len(valid),train["price"].median())
    pred_2 = category_condition_median_predict(train, valid)

    test_pred = test_df.copy()
    if rmsle(valid["price"],pred_2) < rmsle(valid["price"],pred_1):
        test_pred.loc[:,"price"] = category_condition_median_predict(cleaned, test_pred)
    else:
        test_pred.loc[:,"price"] = cleaned["price"].median()
    sub = test_pred.loc[:,["item_id", "price"]]

    problems = validate_submission(sub,test_pred)
    if any(problems):
        raise ValueError(",".join(problems))
    else:
        return sub
