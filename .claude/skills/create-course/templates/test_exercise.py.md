# テストファイルテンプレート

書式規約:
- ファイル名: `tests/test_exNN.py`(スケルトンと同じ連番)。
- 1課題につき3〜5テスト: 正常系1〜2、エッジケース1〜2、(あれば)代表的な誤実装を弾くケース1。
- テスト名は `test_<関数名>_<何を確認するか>` の日本語コメント付き。テスト自体が仕様書として読めるようにする。
- **スケルトンに対して実行したとき、収集エラーではなく assertion failure / NotImplementedError で落ちること。**
- 乱数はシード固定。外部ネットワーク禁止。実行時間は1ファイル数秒以内。
- 数値比較は `np.allclose` / `pytest.approx` を使う。

```python
from conftest import load_exercise
import numpy as np

ex = load_exercise("ex01_arrays")


# make_range(5) は [1,2,3,4,5] を返す
def test_make_range_basic():
    assert list(ex.make_range(5)) == [1, 2, 3, 4, 5]


# n=1 でも動く(境界値)
def test_make_range_single():
    assert list(ex.make_range(1)) == [1]


# double_all は元の配列を壊さず新しい値を返す
def test_double_all_basic():
    arr = np.array([1, 2, 3])
    result = ex.double_all(arr)
    assert np.array_equal(result, np.array([2, 4, 6]))
```
