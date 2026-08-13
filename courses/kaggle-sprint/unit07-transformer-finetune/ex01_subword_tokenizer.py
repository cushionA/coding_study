# ex01_subword_tokenizer: 小さなmerge規則からサブワードID列を作る


# symbolsへmerge規則を順番に適用する
# mergesは [('a','b'), ('ab','c')] のような優先順リスト
from collections.abc import Mapping, Sequence


def apply_merges(
    symbols: Sequence[str], merges: Sequence[tuple[str, str]]
) -> list[str]:
    # TODO: 各規則について隣接する一致ペアを左から結合する
    raise NotImplementedError


# 空白区切り単語を文字からmergeし、特殊token付きID列へ変換する
# 戻り値: {'tokens': [...], 'input_ids': [...], 'attention_mask': [...]}
def encode(
    text: str, vocab: Mapping[str, int], merges: Sequence[tuple[str, str]]
) -> dict[str, list[str] | list[int]]:
    # TODO: [CLS]/[SEP]を付け、語彙に無いsubwordは[UNK]へする
    raise NotImplementedError
