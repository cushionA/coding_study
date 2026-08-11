# 別セッションへの引き継ぎプロンプト(kaggle-sprint 残作業)

「## 依頼文」以下をそのまま新しいセッションに貼れば引き継げる。
最終更新: 2026-08-10

---

## 現状

全12ユニット。**unit12 を除いて完成している。**

| Day | ユニット | データ | lesson | 演習4本 |
|---:|---|---|---|---|
| 1〜11 | unit01〜unit11 | ✅ | ✅ | ✅ |
| 12 | unit12-lightweight-model-ladder | ✅ | ✅ | **❌ 未作成** |

`python .claude/scripts/check_unit.py courses/kaggle-sprint unit12-lightweight-model-ladder`
→ `スケルトンなし: courses/kaggle-sprint/unit12-lightweight-model-ladder/ex*.py`

**残作業は2件。**

### 残作業1: unit12 の演習4本(スケルトン・テスト・3段階ヒント・解答・README)

### 残作業2: unit12 lesson の A / D ブロックが「書く」関門になっていない

未記入状態で lesson を全セル実行すると、**8件のチェックポイントが最初から `[OK]` になる**
(実測: `A-1 分類の accuracy` / `A-2 分類の macro-F1` / `A-3 特徴量の次元` /
`D-1〜D-5 規則とタガーの型番・ブランド抽出`)。
これらは lesson 自身の実演コードの出力を照合しているだけで、
**学習者が書いた結果を採点していない**。他のユニットは同種のガード用チェックが0〜1件なので、
unit12 だけ突出している。

A ブロックと D ブロックに `# ここに書く` セルを足し、チェックポイントを
**学習者が書いた変数を参照する形**に変えること
(現状の「観察の確認」は残してもよいが、それとは別に書く関門を設ける)。
テンプレートの ⑦ は必須要素であり、`unit01` の書式が見本。

### 解決済み(再対応不要)

- Day1〜5 の private LB 発表が壊れていた件 → 修正済み。実際に LB 表が出ることを実測確認済み
- unit10 のキャップストーンが分類タスクで Day1〜4 の回帰コンペと繋がっていなかった件
  → 作り直し済み。unit02 のデータを参照し `log1p` ベースの回帰になっていることを確認済み
- unit09 / unit11 の見出しが Day1〜8 と不揃いだった件 → 統一済み。
  全12ユニットで `# ここに書く` に揃い、`TODO` はゼロ

### 学習の進行状況

学習者は **Day1 を完了済み**(lesson + ex01〜ex04 すべて合格)。
`progress/kaggle-sprint.json` と `notes/2026-08-10_unit01-competition-anatomy.md` を参照。
ex04 は attempts=6 / tier=2 で、3段の退避チェーンが山場になった。

---

## 依頼文(ここから下を新セッションに貼る)

`courses/kaggle-sprint/unit12-lightweight-model-ladder` の**演習一式**を作ってください。
このユニットには lesson.ipynb はありますが、演習が未作成です。

このリポジトリは Claude Code をチューターとする自習教材システムです。`CLAUDE.md` に教え方の方針があります。

### 必ず読むもの(この5つだけでよい)

1. `.claude/skills/create-course/templates/exercise.py.md` / `test_exercise.py.md` /
   `hints.md.md` / `conftest.py.md` / `unit-readme.md.md` — 書式の正本。
   **conftest.py は固定仕様なのでそのままコピーすること**
2. **`courses/kaggle-sprint/unit01-competition-anatomy/`** の `ex01`〜`ex04`・`tests/`・`hints/`
   — 承認済みの書式見本
3. **`courses/kaggle-sprint/unit12-lightweight-model-ladder/lesson.ipynb`**
   — 演習は lesson の直後に解くものなので、**lesson で説明済みの用語・API だけを前提にし、
   lesson でやったことの一歩先を書かせる**必要があります。必読
4. `courses/kaggle-sprint/unit12-lightweight-model-ladder/data/` の
   `make_data.py` と `MEASUREMENTS.md` — **実測値の正本。自分で測り直さないこと**
5. `courses/kaggle-sprint/course.json` の該当ユニットの `summary` と `learner_profile`

### 生成するもの

```
unit12-lightweight-model-ladder/
  README.md                 ← ユニットの地図(テンプレートに従う)
  ex01_*.py 〜 ex04_*.py    ← スケルトン(micro → variant → medium → capstone)
  tests/conftest.py         ← テンプレートをそのままコピー
  tests/test_ex01.py 〜 test_ex04.py
  hints/ex01.md 〜 ex04.md  ← tier1(概念)/ tier2(方針)/ tier3(あと1行)
courses/kaggle-sprint/.solutions/unit12-lightweight-model-ladder/
  ex01_*.py 〜 ex04_*.py    ← 学習者ファイルと同名の完成版
```

`.solutions/unit12-lightweight-model-ladder/_answer.csv` は既にあります。**消さないでください。**

### ★作業順序の強制(これを守らないと予算切れで失敗します)

この種のタスクは過去に**5回中4回**、同じ失敗で停止しました。原因は
「成果物を書く前に、期待値を得るための探索的なコード実行を繰り返して予算を使い切る」ことです。

**フェーズA(コードを一切実行しない)**: 演習・テスト・ヒント・解答を最後まで書き切る。
**フェーズB(1回だけ実行)**: pytest を回して検証する。
**フェーズC**: 落ちた箇所だけ直す。実行は最大3回まで。

テストの期待値は `data/MEASUREMENTS.md` と `make_data.py` の docstring にある実測値を使ってください。
そこに無い値が必要なら、**解答ファイル側に計算させて、テストは「解答の出力と期待リテラルの一致」ではなく
「性質」を検証する**設計に寄せてください(例: 行数・shape・単調性・境界値)。

### 品質規約(厳守)

- スケルトンは `TODO` コメント + `raise NotImplementedError` または `return None` で、
  **テストが必ず落ちる**状態にする
- **スケルトンのコメントに解答コードを書かない**(`check_unit.py` が漏洩検査をします)。
  ヒントは「何をするか」の日本語であって、コードではありません
- テストは**期待値をリテラルで書く**。解答ロジックをテスト内で再実装して比較しない
  (それでは両方間違っていても通ってしまう)
- テストに **shape / 行数の中間アサーション**を入れる
  (学習者は shape の取り違えが既知のつまずきです)
- テストの失敗メッセージは学習者が自力で直せる情報を出す
  (`assert x == y, "行数が3040なら重複除去を忘れている"` のように)
- ヒントは3段階。**tier3 でも完全な解答コードは書かず**「あと1行」の状態まで
- 演習を実行してもユニットディレクトリに余計なファイルを残さない。
  出力が必要なテストは `tmp_path` を使う
- **完全オフライン**。ネットワーク・事前学習済み重みのダウンロードは禁止
  (この環境では `download.pytorch.org` も `huggingface.co` も 403 になります)
- 日本語。学習者は **C# を高レベルで習得済み・AtCoder茶色到達済み・NumPy習得済み**ですが、
  **pandas / scikit-learn は level 0**。C#アナロジーは有効なところだけ使う
- 環境: Python 3.11 / GPUなし / pandas 3.0.5 / lightgbm 4.7 / torch 2.13 / transformers 5.14。
  **pandas 3.0 では文字列列の dtype が `object` ではなく `str`**
  (`pd.api.types.is_numeric_dtype` の否定で判定する)。
  **LightGBM 4.x の `fit()` に `early_stopping_rounds` は無い**
  (`callbacks=[lgb.early_stopping(50)]` を使う)

### 検証(必須。これをやっていない生成物は受け付けません)

1. スケルトン状態:
   `python -m pytest courses/kaggle-sprint/unit12-lightweight-model-ladder/tests -q` が**失敗する**
   (収集エラーではなく、アサーション失敗として落ちること)
2. 解答状態:
   `USE_SOLUTIONS=1 python -m pytest courses/kaggle-sprint/unit12-lightweight-model-ladder/tests -q`
   が**全て通る**
3. `python .claude/scripts/check_unit.py courses/kaggle-sprint unit12-lightweight-model-ladder`
   が `"ok": true` を返す
4. 一時ファイル・`output/`・`__pycache__` を残さない

完了したら、4演習それぞれの課題内容・テスト件数・スケルトンと解答の pytest 実測結果・
`check_unit.py` の出力を日本語で簡潔に報告してください。
**報告は短くてよいので、まず成果物を完成させることを優先してください。**

### 仕上げ

`course.json` の unit12 の `generated` / `exercises_generated` を `true` にし、
`progress/kaggle-sprint.json` の `skills` に unit12 の `concepts` が
level 0 で入っているか確認してください(無ければ追加)。

### 作業ブランチ

`claude/atcoder-bronze-learning-course-h25tth` で作業し、完了後に master へマージしてください。
コミットメッセージは `feat(kaggle-sprint): ...` の形式。
