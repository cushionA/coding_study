# course.json テンプレート

コースの定義と生成状態。`curriculum-architect` が生成し、ユニット生成のたびに orchestrator が `generated` を更新する(中断・再開の要)。

```json
{
  "name": "ml-intro",
  "title": "機械学習入門",
  "language": "python",
  "format": { "lesson": "jupyter", "grading": "pytest", "reason": "実行→観察が数秒で回り、セル単位の即時チェックが可能" },
  "test_command": "python -m pytest {unit}/tests -q",
  "goal": "CSVを読み込み、前処理し、scikit-learnでモデルを学習・評価するエンドツーエンドの流れを一人で書ける",
  "learner_profile": "C# AtCoder茶色、OOP理解あり、Python経験浅い",
  "created": "2026-07-03",
  "units": [
    {
      "dir": "unit01-numpy-basics",
      "title": "NumPy配列の基本",
      "summary": "配列生成・全要素演算・ブールマスク・ブロードキャスト",
      "concepts": ["numpy-vectorize", "numpy-masking", "numpy-broadcasting"],
      "exercises": ["ex01_arrays", "ex02_indexing", "ex03_broadcasting", "ex04_capstone"],
      "estimated_minutes": 45,
      "generated": false,
      "reviewed": false
    }
  ]
}
```

規約:
- `units[].concepts` はそのユニットで習得する概念のスラッグ(kebab-case)。progress.json の `skills` のキーになる。3〜5個。
- `units[].exercises` の最後の要素は原則そのユニットの capstone(micro → variant → medium → capstone の構成)。
- `generated`: exercise-writer がスケルトン/テスト/ヒント/解答を書き、FAIL→PASS 検証を通したら true。
- `reviewed`: course-reviewer の重大指摘ゼロ(または差し戻し解消)で true。
- `created` は `Get-Date -Format yyyy-MM-dd` の実行結果。
