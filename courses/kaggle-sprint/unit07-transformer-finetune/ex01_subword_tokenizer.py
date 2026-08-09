# ex01_subword_tokenizer: 小さなmerge規則からサブワードID列を作る


# symbolsへmerge規則を順番に適用する
# mergesは [('a','b'), ('ab','c')] のような優先順リスト
def apply_merges(symbols, merges):
    # TODO: 各規則について隣接する一致ペアを左から結合する
    raise NotImplementedError


# 空白区切り単語を文字からmergeし、特殊token付きID列へ変換する
# 戻り値: {'tokens': [...], 'input_ids': [...], 'attention_mask': [...]}
def encode(text, vocab, merges):
    # TODO: [CLS]/[SEP]を付け、語彙に無いsubwordは[UNK]へする
    raise NotImplementedError
