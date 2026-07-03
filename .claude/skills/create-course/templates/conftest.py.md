# conftest.py テンプレート(固定仕様 — 変更禁止)

各ユニットの `tests/conftest.py` に以下をそのままコピーする。テストは `load_exercise("exNN_name")` でモジュールを取得する。`USE_SOLUTIONS=1` のとき `.solutions/<unit>/` 側の同名ファイルを読み込む。

```python
import importlib.util
import os
from pathlib import Path


def load_exercise(name):
    unit_dir = Path(__file__).resolve().parents[1]
    if os.environ.get("USE_SOLUTIONS") == "1":
        target = unit_dir.parent / ".solutions" / unit_dir.name / f"{name}.py"
    else:
        target = unit_dir / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, target)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
```

注意:
- Python 以外の言語のコースでは、この仕様(学習者ファイル/解答ファイルを環境変数で切替できるテストローダー)を当該言語のテストフレームワークで同等に実現する。
- テストファイル冒頭で `from conftest import load_exercise` はしない。pytest の conftest 自動読込に頼らず、fixture でもなく、`conftest` を直接 import する場合は `sys.path` 問題が出るため、**テストファイルでは以下の定型を使う**:

```python
from conftest import load_exercise  # pytest は tests/ を rootdir に追加するのでこれで動く

ex = load_exercise("ex01_arrays")
```

pytest 実行は必ずユニットの `tests/` ディレクトリを対象に行う(`python -m pytest courses/<c>/<unit>/tests -q`)。
