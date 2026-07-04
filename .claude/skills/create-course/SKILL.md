---
name: create-course
description: 新しい学習コースを生成する。トピックと対象言語をヒアリングし、既習スキルでパーソナライズ→カリキュラム設計→lesson.ipynb+演習の生成→検証レビューまでを実行する。「コースを作って」「教材を生成して」「〜を勉強したい(コースがまだない場合)」で起動。
---

# create-course — 学習コース生成

新コースを `courses/<course>/` に生成する。テンプレートは本スキルの `templates/` 配下。各ユニットは3層(README=地図 / lesson.ipynb=一緒にやる / exNN.py=一人でやる)。

## 手順

### 1. ヒアリング
不明なら AskUserQuestion で確認: ①トピック ②対象言語 ③目標(「実務参加可能」の具体像)④希望ユニット数(既定5〜8)。学習者の既習スキルは手順2の skill-map(`baseline` 出典に C#・OOP 等が入っている)を正本とし、教え方の方針は CLAUDE.md を使う。

### 2. パーソナライズ材料の収集(スキルマップ連携)
- `python .claude/scripts/build_skill_map.py` を実行し、`progress/skill-map.json`(全コース横断の概念×レベル集約)を最新化して読む。
  - level>=3 の概念は新コースでは復習扱い(lesson で圧縮、演習は1つに)。level 1〜2 で止まっている概念は厚めに。level 0/未登録は通常どおり。
  - **概念スラッグはコースごとに違う**(例: `python-list-comprehension` と `ts-array-methods`)。完全一致に頼らず、curriculum-architect に skill-map 全体を渡して**意味で対応付け**させる(手順5)。
- `notes/` の直近数件から、つまずき傾向・有効だった説明スタイルを拾う。
- 初回(skill-map が空 or 全 level 0)はプロファイルのみで設計。

### 3. 教材形式の選定(言語・トピックごとに最適化)
「一緒にやる」層と採点機構の媒体を、対象言語・トピックに合わせて決める。**Pythonのipynbを盲目的に流用しない**:

| 対象 | lesson層(一緒にやる) | 採点機構 |
|------|----------------------|----------|
| Python(データ系) | Jupyter notebook(チェックポイントセル) | pytest |
| Python(CLI/Web系) | notebook または 実行スクリプト+対話 | pytest |
| C# | .NET Interactive notebook(polyglot)が使えるか実測。不可なら「小さなConsoleプロジェクト+段階実行」 | xUnit/NUnit |
| JavaScript/TypeScript | 小さな実行スクリプト+node、またはブラウザ+live preview | vitest/jest |
| SQL | クエリファイル+ローカルSQLite | 期待結果との照合スクリプト |

判断基準: ①実行→観察のループが数秒で回るか ②ブロック単位の即時チェックができるか ③学習者の環境で追加セットアップが最小か。選定結果と理由を course.json の `format` フィールドに記録する(例: `{"lesson": "jupyter", "grading": "pytest"}`)。新しい形式を選んだ場合は `templates/lesson.ipynb.md` の構造(なぜ→解説→見る→予測→変える→書く→チェック)を**その媒体に翻訳**して適用する — 構造は媒体に依存しない。

### 4. 環境実測
選定した形式に必要なランタイム・テストFW・ライブラリ(Python+Jupyter なら ipykernel/nbformat)をコマンドで確認。不足があればインストール(コース生成に必須のものは自動で入れてよい。システム全体に影響するものだけユーザーに確認)。

### 5. カリキュラム設計
`curriculum-architect` を起動し、course.json(units[].concepts 必須)とコースREADMEを生成させる。プロンプトには **`progress/skill-map.json` の中身(または手順2の要約)を丸ごと含め**、「既習概念に意味で対応する単元は圧縮/演習削減、停滞概念は補強、前提の穴は補講ユニットを足す」よう明示的に指示する。
結果(ユニット一覧・概念・マイルストーン+**既習度をどう反映したかの説明**)を**ユーザーに提示して承認を得る**。

### 6. ユニット生成(各ユニット = lesson + 演習の2工程)
1. **unit01 を先行生成**して書式承認を得る:
   - `lesson-writer`(opus)が `templates/lesson.ipynb.md` に従い lesson.ipynb を生成(nbformat 使用、実行検証まで)
   - `exercise-writer`(sonnet)がスケルトン・テスト・ヒント・解答を生成(FAIL/PASS 実測まで)
2. 承認後、残りユニットを並列生成(2〜3並列)。**course.json は orchestrator だけが更新する**(エージェントには触らせない)。
3. ユニット完了ごとに `"generated": true`。中断してもこのフラグから再開できる。

### 7. レビュー(2段)
1. `python .claude/scripts/check_unit.py courses/<course> <unit>` — 機械チェック(必須ファイル・テスト両方向・解答漏洩ヒューリスティック)。
2. `course-reviewer` を起動 — 教材品質(説明密度: ライブラリ未知の人が lesson だけで演習を解けるか / TODO・tier3の漏洩 / 難易度勾配 / アナロジー正確性 / lesson の実行可能性)。
「差し戻し」なら該当writer に修正させ再レビュー(最大2周、解消しなければユーザーに報告)。合格で `"reviewed": true`。

### 8. 仕上げ
1. `templates/progress.json.md` から `progress/<course>.json` を初期化(`skills` は units[].concepts を level 0 で展開)。
2. プロジェクトが git 未初期化なら `git init` + 生成物を初回コミット(`learn(<course>): コース生成`)。
3. 完了報告: ユニット・課題数・検証結果、開始方法(`/study`、VS Code で lesson.ipynb を開く)を案内。

## 再開(course.json が既にある場合)
`generated: false` / `reviewed: false` のユニットだけを手順6〜7で処理する。
