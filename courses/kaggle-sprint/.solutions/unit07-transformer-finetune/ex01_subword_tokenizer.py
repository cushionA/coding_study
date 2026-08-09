def apply_merges(symbols, merges):
    symbols = list(symbols)
    for left, right in merges:
        merged = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                merged.append(left + right)
                i += 2
            else:
                merged.append(symbols[i])
                i += 1
        symbols = merged
    return symbols


def encode(text, vocab, merges):
    tokens = ["[CLS]"]
    for word in str(text).split():
        tokens.extend(apply_merges(list(word), merges))
    tokens.append("[SEP]")
    unk = vocab["[UNK]"]
    return {"tokens": tokens, "input_ids": [vocab.get(token, unk) for token in tokens], "attention_mask": [1] * len(tokens)}
