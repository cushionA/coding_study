# progress.json テンプレート

`progress/<course>.json`。`/study` が読み書きする唯一の進捗ファイル。日付はすべて `Get-Date -Format yyyy-MM-dd` の実行結果。

```json
{
  "course": "ml-intro",
  "started": "2026-07-03",
  "current": { "unit": "unit01-numpy-basics", "phase": "lesson", "exercise": null },
  "lessons": {},
  "exercises": {},
  "skills": {},
  "review_queue": [],
  "milestones": {}
}
```

各フィールドの規約:

- `current.phase`: `"lesson"`(lesson.ipynb 進行中)| `"exercise"`(演習中)。`exercise` は演習中のみ課題名。
- `lessons` のキーはユニット dir 名。値: `{ "completed_at": "YYYY-MM-DD", "reflection": "振り返りセルの要約1行" }`
- `exercises` のキーは `"unit01/ex01_arrays"` 形式。値:
  ```json
  { "status": "passed", "attempts": 2, "hint_tier_used": 1, "stumbled": false, "completed_at": "2026-07-03" }
  ```
  - `attempts`: テスト実行して不合格だった回数+1(初回合格なら1)。
  - `hint_tier_used`: 開示した最大tier(未使用は0)。
  - `stumbled`: `attempts >= 4` または `hint_tier_used == 3` で true。
- `skills` のキーは概念スラッグ(course.json の units[].concepts に対応)。値:
  ```json
  { "level": 2, "updated": "2026-07-03", "evidence": "unit01 lesson通過" }
  ```
  レベル定義: 0=未着手 / 1=解説を読んで理解 / 2=ガイド付きで書けた(lesson通過) / 3=ヒントなしで書けた(演習をtier0-1・attempts<=3で合格) / 4=自分の言葉で説明できた(Feynmanチェック)
- `review_queue` の要素:
  ```json
  { "source": "unit01/ex03_broadcasting", "due": "2026-07-04", "done": null, "variant_file": null }
  ```
  `stumbled` 確定時に +1/+3/+7/+14日の4件、ユニット完了時に `"source": "<unit>"` で+7日1件を登録。消化したら `done` に日付、`variant_file` にファイル名。
- `milestones` のキーはユニット dir 名。値: `{ "checked": ["..."], "feynman_passed": false, "completed_at": null }`
