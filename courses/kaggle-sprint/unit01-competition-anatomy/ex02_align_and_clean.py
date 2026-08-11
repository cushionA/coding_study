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
def detect_alignment_issues(train:pd.DataFrame, test:pd.DataFrame, categorical_cols):
    # TODO: 列の差分(set の差集合)・dtype の比較(共通列だけ)・カテゴリ値の差分(set の差集合)を
    #       それぞれ求めて、指定の3キーを持つ dict にまとめる(ヒント参照)。
    unique_train = list(set(train.columns) - set(test.columns))
    unique_train.sort()
    mismatch = {}
    for col in (set(train.columns) - set(unique_train)):
        tes = test[col].dtype
        tra = train[col].dtype
        if(tes != tra):
            mismatch[col] = (str(tra),str(tes))
    unseen = {}
    for col in categorical_cols:
        diff = list(set(test[col]) - set(train[col]))
        if(len(diff) > 0):
            diff.sort()
            unseen[col] = diff 
    return {
        "train_only_columns": unique_train,
        "dtype_mismatches": mismatch,
        "unseen_categories":unseen
    }


# df をクリーニングし、(掃除後のDataFrame, 各ステップの記録のlist) を返す。
# ステップは必ずこの順で行う:
#   1. item_id を除いた完全重複行を削除
#   2. price <= 0 の行を削除
#   3. price > 1_000_000 の行を削除(外れ値)
#   4. views < 0 を欠損(NaN)に置き換える(行は削除しない)
# 記録の各要素は {"step": str, "rows_before": int, "rows_after": int} の dict。
def clean_data(df:pd.DataFrame):
    # TODO: 4ステップを順番に適用し、各ステップの直前直後の行数を log に積んでいく。
    #       重複除去には item_id を除いた列リストを使う。負の views は行を消さず値だけ書き換える。
    log = []
    deduped = df.drop_duplicates(subset=[col for col in df.columns if col != "item_id"])
    log.append({"step": "remove_duplicates", "rows_before": len(df), "rows_after": len(deduped)})
    min_checked = deduped[deduped["price"]>0]
    log.append({"step": "remove_price_zero_or_negative", "rows_before": len(deduped), "rows_after": len(min_checked)})
    max_checked = min_checked[min_checked["price"]<=1_000_000]
    log.append({"step": "remove_price_outliers", "rows_before": len(min_checked), "rows_after": len(max_checked)})
    after = max_checked.copy()
    after.loc[max_checked["views"] < 0,"views"] = pd.NA
    log.append({"step": "replace_negative_views", "rows_before": len(max_checked), "rows_after": len(after)})
    return (after,log)