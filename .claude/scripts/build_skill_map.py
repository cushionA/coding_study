"""全コース横断のスキルマップを progress/skill-map.json に集約する。
progress/<course>.json の skills(概念→レベル)を、course.json のユニット文脈と
突き合わせて1ファイルにまとめる。/study が学習後に更新し、/create-course が設計前に読む。
使い方: python .claude/scripts/build_skill_map.py [progress_dir=progress] [courses_dir=courses]
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# スキルレベル(0〜4)の唯一の定義。CLAUDE.md・progress.json.md 等はここを参照する。
# ラベル=各レベルの意味、判定基準=/study がそのレベルを付与する条件。
LEVEL_RUBRIC = {
    0: {"label": "未着手", "criteria": "まだ触れていない"},
    1: {"label": "解説を読んで理解", "criteria": "lesson の解説を読んで概念を理解した"},
    2: {"label": "ガイド付きで書けた", "criteria": "lesson を通過した(ガイド付きで書けた)"},
    3: {"label": "ヒントなしで書けた", "criteria": "演習を tier0-1・attempts<=3 で合格した"},
    4: {"label": "自分の言葉で説明できた", "criteria": "ユニット完了時の Feynman チェックを通過した"},
}
LEVEL_LABELS = {k: v["label"] for k, v in LEVEL_RUBRIC.items()}

def load_json(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))

def concept_context(courses_dir, course, concept):
    """概念スラッグが属するユニットのタイトルを返す(意味マッチングの手がかり)。"""
    cj = Path(courses_dir) / course / "course.json"
    if not cj.exists():
        return None
    for u in load_json(cj).get("units", []):
        if concept in u.get("concepts", []):
            return u.get("title")
    return None

def main():
    progress_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("progress")
    courses_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("courses")

    concepts = {}
    latest = ""
    for pf in sorted(progress_dir.glob("*.json")):
        if pf.name == "skill-map.json":
            continue
        data = load_json(pf)
        course = data.get("course", pf.stem)
        for slug, info in data.get("skills", {}).items():
            level = int(info.get("level", 0))
            updated = info.get("updated", "")
            latest = max(latest, updated)
            # エントリに明示的な context があれば優先(baseline 等 course.json を持たない出典用)
            ctx = info.get("context") or concept_context(courses_dir, course, slug)
            entry = concepts.setdefault(slug, {
                "level": 0, "updated": "", "sources": [], "context": ctx,
            })
            if ctx and not entry["context"]:
                entry["context"] = ctx
            src = {"course": course, "level": level, "unit": ctx}
            entry["sources"].append(src)
            if level > entry["level"]:
                entry["level"] = level
            entry["updated"] = max(entry["updated"], updated)

    ordered = dict(sorted(
        concepts.items(),
        key=lambda kv: (-kv[1]["level"], kv[0]),
    ))
    for slug, e in ordered.items():
        e["level_label"] = LEVEL_LABELS.get(e["level"], "")

    out = {
        "updated": latest,
        "legend": LEVEL_RUBRIC,
        "note": "スキルレベルの唯一の定義はこの legend。概念スラッグはコース固有なので create-course は意味で対応付けて既習度を反映する。",
        "concepts": ordered,
    }
    dest = progress_dir / "skill-map.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    strong = [s for s, e in ordered.items() if e["level"] >= 3]
    weak = [s for s, e in ordered.items() if 1 <= e["level"] <= 2]
    print(json.dumps({
        "written": str(dest),
        "total_concepts": len(ordered),
        "strong(>=3)": strong,
        "weak(1-2)": weak,
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
