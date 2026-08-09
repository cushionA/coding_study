# ex02_string_similarity: 表記ゆれを文字列DPと集合で数値化する


# 挿入・削除・置換の最小回数を2次元DPで返す
def levenshtein(a, b):
    # TODO: (len(a)+1, len(b)+1) の表を埋める
    raise NotImplementedError


# 長い方の文字数で正規化した0〜1の類似度を返す
def normalized_edit_similarity(a, b):
    # TODO: 空文字列も考慮し、編集距離を「近いほど大きい値」へ変換する
    raise NotImplementedError


# 文字n-gram集合を返す。短い文字列は文字列全体を1要素にする
def char_ngrams(text, n=2):
    # TODO: 長さに応じて連続部分文字列の集合を作る
    raise NotImplementedError


# 2集合のJaccard係数を返す
def jaccard(left, right):
    # TODO: 両方空の境界値を扱い、積集合/和集合を求める
    raise NotImplementedError
