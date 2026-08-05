# ex02_filter_select: 行フィルタと列選択
# C#の LINQ .Where(...) はpandasでは「ブールマスクを添字にする」形になる(NumPyのex02と同じ発想)。
# loc は「ラベル(列名・行ラベル)で指定」、iloc は「位置(0始まりの整数)で指定」という違いがある。

import pandas as pd


# 指定した列の値が threshold より大きい行だけを残したDataFrameを返す
# (C#: list.Where(x => x.Prop > threshold).ToList())
def filter_by_threshold(df: pd.DataFrame, column: str, threshold: float) -> pd.DataFrame:
    # TODO: 条件式からブールマスクを作り、それで行を絞り込む
    raise NotImplementedError


# 複数の列名(リスト)だけを選択したDataFrameを返す
# (C#: list.Select(x => new { x.A, x.B }) に相当)
def select_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    # TODO: 複数列を選ぶときは、1列のときと違う形で添字を渡す
    raise NotImplementedError


# 先頭から n 行だけを iloc で取り出して返す
def first_n_rows(df: pd.DataFrame, n: int) -> pd.DataFrame:
    # TODO: 位置(整数)で行を指定する専用のアクセサを使う
    raise NotImplementedError


# 指定した行ラベル(index)の、指定した列の値を loc で取り出して返す
def get_cell(df: pd.DataFrame, row_label: object, column: str) -> object:
    # TODO: ラベル(行ラベル・列名)で指定する専用のアクセサを使う
    raise NotImplementedError


# 既存の2列を使って新しい列を追加したDataFrameを返す(元のdfは変更しない)
# 新しい列名は new_column、値は col_a の値 - col_b の値
# (C#: 匿名型に計算プロパティを足す代わりに、新しい列として表に追加する)
def add_diff_column(df: pd.DataFrame, col_a: str, col_b: str, new_column: str) -> pd.DataFrame:
    # TODO: df.copy() で複製してから新しい列に代入する(元のdfを直接書き換えない)
    raise NotImplementedError
