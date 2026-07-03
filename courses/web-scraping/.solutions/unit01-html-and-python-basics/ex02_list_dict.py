# ex02_list_dict: リスト内包表記と辞書操作
# スクレイピングでは「タグの集合からURLだけ集める」「出現回数を数える」といった
# リスト/辞書操作が頻出する。C#のLINQ(Select/Where)とDictionary<K,V>に相当する
# Pythonの書き方(リスト内包表記・dict)にここで慣れておく。


# 文字列のリストから、5文字以上のものだけを大文字にして返す
# (C#: words.Where(w => w.Length >= 5).Select(w => w.ToUpper()).ToList() に相当)
def long_words_upper(words):
    return [w.upper() for w in words if len(w) >= 5]


# タグ名のリストから、各タグの出現回数を数えた辞書を返す
# 例: ["浅煎り", "焙煎", "浅煎り"] -> {"浅煎り": 2, "焙煎": 1}
# (C#: words.GroupBy(w => w).ToDictionary(g => g.Key, g => g.Count()) に相当)
def count_tags(tags):
    counts = {}
    for tag in tags:
        counts[tag] = counts.get(tag, 0) + 1
    return counts


# {タグ名: 出現回数} の辞書から、出現回数が most 番目に多いタグ名を1つ返す
# most=1なら最多、most=2なら2番目に多いタグ、という意味
# 同数の場合はタグ名の昇順で順位を決める
def most_common_tag(counts, most=1):
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return ordered[most - 1][0]


# {タグ名: 出現回数} の辞書から、出現回数が1回だけ(ユニーク)のタグ名のリストを
# タグ名の昇順で返す
def unique_tags(counts):
    return sorted(tag for tag, count in counts.items() if count == 1)
