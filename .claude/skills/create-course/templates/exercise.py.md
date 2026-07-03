# スケルトン(学習者が編集するファイル)テンプレート

書式規約:
- ファイル名: `exNN_<name>.py`(NNは2桁連番)。`.solutions/<unit>/` に同名の完成版を置く。
- **import 可能であること**(構文エラー・実行時エラー禁止)。トップレベルで例外を投げない。
- コードの約70%は提供し、学習者が埋めるのは15〜30%。埋める箇所は `# TODO:` コメント+`raise NotImplementedError` で明示する。
- **TODO コメントは「何を埋めるか」だけを書く(tier1相当まで)。使うAPIの完全形・引数の確定値・そのまま書けば通る式は書かない** — それらは hints の tier2/tier3 の領分。TODO が tier3 ヒントより詳しくなっていたら書きすぎ。
  - 悪い例: `# TODO: rng = np.random.default_rng(seed) してから rng.integers(0, 101, size=(n, m))`(コピペで通る=解答漏洩)
  - 良い例: `# TODO: シード固定の乱数生成器から整数の2次元配列を作る(ヒント参照)`
- 各関数の直前に日本語1〜2行で「何をする関数か」を書く(docstringではなくコメント)。課題の狙いが伝わる最小限にする。
- 1ファイル = 1課題。関数2〜4個程度、30〜45分セッションの一部として5〜15分で解ける分量。
- 外部ネットワークアクセス禁止。データが必要なら組み込みデータセットかシード固定の生成。

```python
# ex01_arrays: NumPy配列の基本操作
# C#の配列と違い、NumPy配列は全要素が同じ型で、演算子が全要素に一括適用される。

import numpy as np


# 1からnまでの整数配列を作って返す
# (C#: Enumerable.Range(1, n).ToArray() に相当)
def make_range(n):
    # TODO: 範囲から配列を作る(ループ不要。詰まったらヒント参照)
    raise NotImplementedError


# 配列の全要素を2倍して返す
def double_all(arr):
    # TODO: ループを書かずに全要素を2倍する
    raise NotImplementedError
```
