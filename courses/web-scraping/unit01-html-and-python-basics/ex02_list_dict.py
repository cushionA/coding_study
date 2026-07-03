# ex02_list_dict: リスト内包表記と辞書操作
# スクレイピングでは「タグの集合からURLだけ集める」「出現回数を数える」といった
# リスト/辞書操作が頻出する。C#のLINQ(Select/Where)とDictionary<K,V>に相当する
# Pythonの書き方(リスト内包表記・dict)にここで慣れておく。


# 文字列のリストから、5文字以上のものだけを大文字にして返す
# (C#: words.Where(w => w.Length >= 5).Select(w => w.ToUpper()).ToList() に相当)
def long_words_upper(words):
    # TODO: リスト内包表記で「条件を満たす要素だけ変換する」を1行で書く
    raise NotImplementedError


# タグ名のリストから、各タグの出現回数を数えた辞書を返す
# 例: ["浅煎り", "焙煎", "浅煎り"] -> {"浅煎り": 2, "焙煎": 1}
# (C#: words.GroupBy(w => w).ToDictionary(g => g.Key, g => g.Count()) に相当)
def count_tags(tags):
    # TODO: 辞書を使ってタグごとの出現回数を数える(ループ or 内包表記どちらでもよい)
    raise NotImplementedError


# {タグ名: 出現回数} の辞書から、出現回数が most 番目に多いタグ名を1つ返す
# most=1なら最多、most=2なら2番目に多いタグ、という意味
# 同数の場合はタグ名の昇順で順位を決める
def most_common_tag(counts, most=1):
    # TODO: 辞書の項目を出現回数の降順(同数はタグ名昇順)に並べ、most番目を取り出す
    raise NotImplementedError


# {タグ名: 出現回数} の辞書から、出現回数が1回だけ(ユニーク)のタグ名のリストを
# タグ名の昇順で返す
def unique_tags(counts):
    # TODO: 辞書を走査して出現回数が1の項目だけ抽出し、キーを昇順に並べる
    raise NotImplementedError
