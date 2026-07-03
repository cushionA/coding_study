"""ユニット整合性チェック: 必須ファイル / テスト両方向 / 解答漏洩ヒューリスティック
使い方: python .claude/scripts/check_unit.py courses/<course> <unit-dir>
終了コード 0=合格 1=問題あり
"""
import json
import os
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

def run_pytest(tests_dir, use_solutions):
    env = os.environ.copy()
    if use_solutions:
        env["USE_SOLUTIONS"] = "1"
    else:
        env.pop("USE_SOLUTIONS", None)
    r = subprocess.run(
        [sys.executable, "-m", "pytest", str(tests_dir), "-q", "--tb=no"],
        capture_output=True, text=True, env=env,
    )
    return r.returncode, (r.stdout or "") + (r.stderr or "")

def solution_code_lines(path):
    lines = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s or s.startswith("#") or s.startswith(("import ", "from ", "def ", "return")):
            continue
        s = s.removeprefix("return ").strip()
        if len(s) >= 10 and ("(" in s or "=" in s):
            lines.append(s)
    return lines

def main():
    course = Path(sys.argv[1])
    unit = sys.argv[2]
    unit_dir = course / unit
    sol_dir = course / ".solutions" / unit
    problems = []

    for req in ["README.md", "lesson.ipynb", "tests/conftest.py"]:
        if not (unit_dir / req).exists():
            problems.append(f"必須ファイルなし: {unit_dir / req}")

    skeletons = sorted(unit_dir.glob("ex*.py"))
    if not skeletons:
        problems.append(f"スケルトンなし: {unit_dir}/ex*.py")
    for sk in skeletons:
        num = sk.name.split("_")[0]
        if not (unit_dir / "tests" / f"test_{num}.py").exists():
            problems.append(f"テストなし: tests/test_{num}.py")
        if not (unit_dir / "hints" / f"{num}.md").exists():
            problems.append(f"ヒントなし: hints/{num}.md")
        sol = sol_dir / sk.name
        if not sol.exists():
            problems.append(f"解答なし: {sol}")
            continue
        # 提供コードは解答と一致していて正当なので、コメント部分だけを漏洩検査する
        comment_text = "\n".join(
            line.split("#", 1)[1]
            for line in sk.read_text(encoding="utf-8").splitlines()
            if "#" in line
        )
        leaks = {ln for ln in solution_code_lines(sol) if ln in comment_text}
        for ln in sorted(leaks):
            problems.append(f"解答漏洩の疑い {sk.name}: '{ln[:60]}'")

    tests_dir = unit_dir / "tests"
    if tests_dir.exists():
        code, out = run_pytest(tests_dir, use_solutions=False)
        tail = out.strip().splitlines()[-1] if out.strip() else ""
        if code == 0:
            problems.append(f"スケルトンでテストが通ってしまう: {tail}")
        elif "error" in tail.lower():
            problems.append(f"スケルトンで収集/実行エラー: {tail}")
        code, out = run_pytest(tests_dir, use_solutions=True)
        tail = out.strip().splitlines()[-1] if out.strip() else ""
        if code != 0:
            problems.append(f"解答でテストが通らない: {tail}")

    result = {"unit": unit, "ok": not problems, "problems": problems}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not problems else 1

if __name__ == "__main__":
    sys.exit(main())
