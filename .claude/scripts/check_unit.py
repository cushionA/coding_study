"""ユニット整合性チェック: 必須ファイル / テスト両方向 / 解答漏洩ヒューリスティック
使い方: python .claude/scripts/check_unit.py courses/<course> <unit-dir>
course.json の format.grading (pytest | vitest) に応じて挙動を切り替える。
終了コード 0=合格 1=問題あり
"""
import json
import os
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

def run(cmd, cwd, use_solutions):
    env = os.environ.copy()
    if use_solutions:
        env["USE_SOLUTIONS"] = "1"
    else:
        env.pop("USE_SOLUTIONS", None)
    r = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True,
                       encoding="utf-8", errors="replace",
                       env=env, shell=isinstance(cmd, str))
    return r.returncode, (r.stdout or "") + (r.stderr or "")

def solution_code_lines(path, comment_prefix):
    skip = ("import ", "from ", "def ", "return", "export ", "const ", "function ", "}", "{")
    lines = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if not s or s.startswith(comment_prefix) or s.startswith(skip):
            continue
        s = s.removeprefix("return ").strip()
        if len(s) >= 10 and ("(" in s or "=" in s):
            lines.append(s)
    return lines

def comment_text_of(path, comment_prefix):
    return "\n".join(
        line.split(comment_prefix, 1)[1]
        for line in path.read_text(encoding="utf-8").splitlines()
        if comment_prefix in line
    )

def main():
    course = Path(sys.argv[1])
    unit = sys.argv[2]
    unit_dir = course / unit
    sol_dir = course / ".solutions" / unit
    problems = []

    fmt = {}
    cj = course / "course.json"
    if cj.exists():
        fmt = json.loads(cj.read_text(encoding="utf-8")).get("format", {})
    grading = fmt.get("grading", "pytest")
    lesson_kind = fmt.get("lesson", "jupyter")

    ext = "py" if grading == "pytest" else "ts"
    comment = "#" if ext == "py" else "//"

    if not (unit_dir / "README.md").exists():
        problems.append(f"必須ファイルなし: {unit_dir / 'README.md'}")
    if lesson_kind == "jupyter":
        if not (unit_dir / "lesson.ipynb").exists():
            problems.append(f"必須ファイルなし: {unit_dir / 'lesson.ipynb'}")
    else:
        lesson_files = sorted((unit_dir / "lesson").glob(f"*.{ext}")) if (unit_dir / "lesson").exists() else []
        if not lesson_files:
            problems.append(f"lessonスクリプトなし: {unit_dir}/lesson/*.{ext}")

    skeletons = sorted(unit_dir.glob(f"ex*.{ext}"))
    if not skeletons:
        problems.append(f"スケルトンなし: {unit_dir}/ex*.{ext}")
    for sk in skeletons:
        num = sk.name.split("_")[0]
        test_name = f"test_{num}.py" if grading == "pytest" else f"{num}.test.ts"
        if not (unit_dir / "tests" / test_name).exists():
            problems.append(f"テストなし: tests/{test_name}")
        if not (unit_dir / "hints" / f"{num}.md").exists():
            problems.append(f"ヒントなし: hints/{num}.md")
        sol = sol_dir / sk.name
        if not sol.exists():
            problems.append(f"解答なし: {sol}")
            continue
        # 提供コードは解答と一致していて正当なので、コメント部分だけを漏洩検査する
        comment_text = comment_text_of(sk, comment)
        leaks = {ln for ln in solution_code_lines(sol, comment) if ln in comment_text}
        for ln in sorted(leaks):
            problems.append(f"解答漏洩の疑い {sk.name}: '{ln[:60]}'")

    tests_dir = unit_dir / "tests"
    if tests_dir.exists() and skeletons:
        if grading == "pytest":
            cmd = [sys.executable, "-m", "pytest", str(tests_dir), "-q", "--tb=no"]
            cwd = Path.cwd()
        else:
            cmd = f'npx vitest run "{unit}/tests" --silent'
            cwd = course
        code, out = run(cmd, cwd, use_solutions=False)
        tail = out.strip().splitlines()[-1] if out.strip() else ""
        if code == 0:
            problems.append(f"スケルトンでテストが通ってしまう: {tail}")
        elif grading == "pytest" and "error" in tail.lower():
            problems.append(f"スケルトンで収集/実行エラー: {tail}")
        code, out = run(cmd, cwd, use_solutions=True)
        tail = out.strip().splitlines()[-1] if out.strip() else ""
        if code != 0:
            problems.append(f"解答でテストが通らない: {tail}")

    if lesson_kind == "script" and (unit_dir / "lesson").exists():
        for lf in sorted((unit_dir / "lesson").glob(f"*.{ext}")):
            runner = f'npx tsx "{lf.resolve()}"' if ext == "ts" else [sys.executable, str(lf.resolve())]
            code, out = run(runner, course, use_solutions=False)
            if code != 0:
                problems.append(f"lessonスクリプトが素の状態でエラー終了: {lf.name}")
            elif "[NG]" not in out:
                problems.append(f"lessonスクリプトにチェックポイントNGがない(未記入でも[NG]が出る設計のはず): {lf.name}")

    result = {"unit": unit, "ok": not problems, "problems": problems}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not problems else 1

if __name__ == "__main__":
    sys.exit(main())
