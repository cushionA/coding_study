# ex01_clean_and_normalize: Web由来テキストを意味を壊さず整える

import html
import re
import unicodedata


# HTML entityを戻し、タグを空白へ置換する
def remove_html_noise(text):
    # TODO: entityとタグを、単語を連結させず本文へ戻す
    raise NotImplementedError


# NFKCで幅を揃え、小文字化し、連続空白を1個へ畳む
def normalize_unicode_space(text):
    # TODO: 文字幅・大文字小文字・空白の表記ゆれを揃える
    raise NotImplementedError


# 価格表記を lesson と共通の <num> トークンへ置換する
# 対象例: 1,980円 / ¥1980 / 1980 円 / 1980JPY
def replace_price(text):
    # TODO: 通貨記号・桁区切り・単位のゆれを捉えて共通化する
    raise NotImplementedError


# 3工程を決まった順で適用する
def clean_text(text):
    # TODO: 上の小さな正規化関数を意味が壊れない順に合成する
    raise NotImplementedError
