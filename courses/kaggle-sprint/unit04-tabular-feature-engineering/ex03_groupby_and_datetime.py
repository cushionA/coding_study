# ex03_groupby_and_datetime: 行数を保つ集約・周期・過去特徴を作る

import numpy as np
import pandas as pd


# group平均と平均からの差を元の各行へ追加する
def add_group_relative(df, group_col, value_col):
    # TODO: transformで元と同じ長さの平均を作り、2列追加したコピーを返す
    raise NotImplementedError


# 日時から曜日と曜日のsin/cos周期特徴を追加する
def add_weekday_cycle(df, date_col):
    # TODO: 日時から曜日と、週の端が連続する周期表現を作る
    raise NotImplementedError


# entityごとに時刻順の1つ前の値を作り、元の行順へ戻す
def add_lag_one(df, entity_col, date_col, value_col):
    # TODO: lessonのlag実演を応用し、未来を見ない直前値を元の行順へ追加する
    raise NotImplementedError
