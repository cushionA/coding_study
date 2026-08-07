# ex02_align_and_clean: train/test のアライメント検査と、データのクリーニング
# lesson では train と test の列・dtype・カテゴリ集合を「1回だけ」突き合わせた。
# ここではその突き合わせを関数化し、さらに掃除の各ステップで何行減ったかを記録する規律を作る。

import pandas as pd


# train と test を突き合わせてアライメント問題を検出する。
# categorical_cols: test 限定の値がないか調べたい列名のリスト(train・test 両方にある列のみ対象)。
# 戻り値の dict:
#   "train_only_columns": train にしかない列名のリスト(sorted)
#   "dtype_mismatches": 共通列のうち dtype が食い違う列 -> (train側dtype文字列, test側dtype文字列) の dict
#   "unseen_categories": categorical_cols のうち test にしかない値がある列 -> その値のリスト(sorted) の dict
def detect_alignment_issues(train, test, categorical_cols):
    # TODO: 列の差分(set の差集合)・dtype の比較(共通列だけ)・カテゴリ値の差分(set の差集合)を
    #       それぞれ求めて、指定の3キーを持つ dict にまとめる(ヒント参照)。
    raise NotImplementedError


# df をクリーニングし、(掃除後のDataFrame, 各ステップの記録のlist) を返す。
# ステップは必ずこの順で行う:
#   1. item_id を除いた完全重複行を削除
#   2. price <= 0 の行を削除
#   3. price > 1_000_000 の行を削除(外れ値)
#   4. views < 0 を欠損(NaN)に置き換える(行は削除しない)
# 記録の各要素は {"step": str, "rows_before": int, "rows_after": int} の dict。
def clean_data(df):
    # TODO: 4ステップを順番に適用し、各ステップの直前直後の行数を log に積んでいく。
    #       重複除去には item_id を除いた列リストを使う。負の views は行を消さず値だけ書き換える。
    raise NotImplementedError
