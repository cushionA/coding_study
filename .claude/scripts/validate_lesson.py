# -*- coding: utf-8 -*-
"""lesson.ipynb 検証: (1)素の状態で全コードセルが例外なく実行され checkpoint が NG を出す
(2)解答を注入すると全 checkpoint が OK になる"""
import io
import sys
import contextlib
import nbformat as nbf

sys.stdout.reconfigure(encoding="utf-8")
path = sys.argv[1]
solutions = {}  # marker -> code to append
if len(sys.argv) > 2:
    exec(open(sys.argv[2], encoding="utf-8").read(), {"__solutions__": solutions}, solutions)
    solutions = solutions.get("SOLUTIONS", {})

nb = nbf.read(path, as_version=4)
ns = {}
out_all = io.StringIO()
failed = False
for i, cell in enumerate(nb.cells):
    if cell.cell_type != "code":
        continue
    src = cell.source
    for marker, sol in solutions.items():
        if marker in src:
            src = src.replace(marker + " = None", marker + " = None\n" + sol)
    try:
        with contextlib.redirect_stdout(out_all):
            exec(src, ns)
    except Exception as e:
        print(f"[CELL {i}] 例外: {type(e).__name__}: {e}")
        failed = True
text = out_all.getvalue()
oks = text.count("[OK]")
ngs = text.count("[NG]")
print(f"OK={oks} NG={ngs} 例外={'あり' if failed else 'なし'}")
print("--- 出力末尾 ---")
print("\n".join(text.strip().splitlines()[-12:]))
sys.exit(1 if failed else 0)
