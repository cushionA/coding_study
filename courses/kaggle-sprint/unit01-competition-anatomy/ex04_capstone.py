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


# このファイルの場所から data/ ディレクトリを解決する(完成済み)。
# 学習者用ファイル(unit直下)から呼ばれても、.solutions/ 側の同名ファイルから呼ばれても動くようにしてある。
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
    # TODO: ex02 でやった4ステップを順番に適用する(ここでは log は不要、掃除後の df だけ返す)
    raise NotImplementedError


# train_part から (category_col, condition_col) の組ごとの price 中央値テーブルを作り、
# target_df の各行を「(category,condition) -> category -> 全体」の3段で退避しながら予測する。
# 戻り値: target_df と同じ長さ・同じ順序の予測値 np.ndarray
def category_condition_median_predict(
    train_part, target_df, category_col="category", condition_col="condition", target_col="price"
):
    # TODO: train_part から (category,condition) ごとの中央値・category ごとの中央値・全体中央値の
    #       3種類を作る。target_df を1行ずつ見て、この順で最初に見つかったものを予測値にする(ヒント参照)。
    raise NotImplementedError


# 提出ファイルとして成立しているかを検査し、問題点の文字列リストを返す(空リスト = 合格)。
# 検査項目: 行数一致 / item_id集合一致 / 列名と順序 / 欠損ゼロ / 負値なし
def validate_submission(sub, test_df, id_col="item_id", pred_col="price"):
    # TODO: 5項目それぞれをチェックし、問題があれば説明文字列を problems に追加していく
    raise NotImplementedError


# 読み込み → アライメント検査(簡易) → クリーニング → ホールドアウトで2ベースライン比較
# → 良い方で test を予測 → 提出の検証、までを1本につなぐ。
# 戻り値: 提出用 DataFrame(item_id, price の2列)
def run_capstone(train_df, test_df, valid_frac=0.2, random_state=0):
    # TODO: 次の手順で1本につなぐ
    #   1. clean_train で train を掃除する
    #   2. split_holdout で学習側/検証側に分ける
    #   3. ベースライン1(全体中央値)と ベースライン2(category_condition_median_predict)を
    #      それぞれ検証側で rmsle 採点する
    #   4. 良い方(rmsle が小さい方)を、掃除後の train 全体を使って学習し直し、test を予測する
    #   5. item_id と price の2列の DataFrame にまとめ、validate_submission に通す
    #      (問題があれば ValueError を送出する)
    raise NotImplementedError
