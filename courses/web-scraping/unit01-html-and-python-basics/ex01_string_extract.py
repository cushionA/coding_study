# ex01_string_extract: 文字列操作の基本(strip/split/replace/f-string)
# スクレイピングで拾った生のHTML文字列は前後に空白や改行が混じっていることが多い。
# BeautifulSoupを使う前に、まずはPython標準の文字列メソッドで素朴な処理に慣れる。
# C#の string.Trim() / string.Split() / string.Replace() とほぼ同じ発想。


# 前後の空白・改行を取り除いた文字列を返す
# (C#: text.Trim() に相当)
def clean_whitespace(text):
    # TODO: 文字列の前後にある空白・改行を取り除く
    raise NotImplementedError


# カンマ区切りの文字列("焙煎, ハンドドリップ, 浅煎り")を、各要素の前後空白も除いたリストにする
# (C#: text.Split(',').Select(s => s.Trim()) に相当)
def split_tags(text):
    # TODO: カンマで分割し、各要素の前後の空白も取り除く
    raise NotImplementedError


# "営業時間: 8:00-19:00" のような "ラベル: 値" 形式の文字列から値の部分だけ取り出す
# (C#: text.Split(':', 2)[1].Trim() に相当。値の中にコロンが含まれる可能性は考えなくてよい)
def extract_value(text):
    # TODO: 最初のコロンで区切り、値側の前後空白を取り除いて返す
    raise NotImplementedError


# name と job から "名前: xxx / 職業: yyy" という形式の1行サマリーを作る
# (C#: $"名前: {name} / 職業: {job}" に相当)
def format_summary(name, job):
    # TODO: f-stringを使って指定フォーマットの文字列を組み立てる
    raise NotImplementedError
