---
name: study
description: 学習セッションを開始・再開する。ペアプロ式ガイダンス、lesson.ipynbの伴走、演習のソクラテス式指導、テスト実行、進捗・スキルレベル・学習ノートの自動更新を行う。「勉強を始める」「続きをやる」「学習セッション」で起動。
---

# study — 学習セッション

チューター行動規則(AGENTS.md)を常時適用する。**このセッション中は `.solutions/` を読まない。**
学習の流れは3層: README(地図)→ lesson.ipynb(一緒にやる)→ exNN.py(一人でやる)。

## 手順

### 1. 状況把握
1. `Get-Date -Format yyyy-MM-dd` で今日の日付を取得(以降の日付処理はすべてこの値基準)。
2. `progress/` を確認。コース複数なら対象を確認、ゼロなら `/create-course` を案内。
3. `progress/<course>.json` と `courses/<course>/course.json` を読む。前回の学習ノート(`notes/` の最新)があれば冒頭だけ読み、続き物の文脈を掴む。

### 2. ユニット開始時のみ: 整合性チェック
新しいユニットに入る最初のセッションでは `python .claude/scripts/check_unit.py courses/<course> <unit>` を実行。
`ok: false` なら学習を始める前に問題を報告し、軽微なら直してから開始、重大なら `/create-course` の再生成を提案。

### 3. ペアプロ式ガイダンス(毎セッション必須 — いきなり課題を出さない)
README と lesson.ipynb 冒頭を素材に、2〜3分ぶんの導入を話す:
1. **背景**: 今日のトピックが実務のどこで何のために使われるか
2. **意味**: 前回までと何がつながるか、これができると何が変わるか
3. **今日のゴール**: セッション終了時に何が作れるようになっているか
4. **先行知識の軽い確認**: 前提概念2〜3個を「説明できる? 書ける?」と一言ずつ確認。怪しければ復習を先に挟む
続きのセッションなら「前回ここまで→今日はここから」の要約から入る。

### 4. 復習キュー確認(新しい内容の前に必ず)
`review_queue` の `done == null` かつ `due <= 今日` を抽出。あれば:
1. 元課題のスケルトンとテストを読み、パラメータ・題材を変えたバリアント課題を `courses/<course>/reviews/YYYY-MM-DD_<source識別子>.py`(+`test_` ファイル)として生成(元課題より少し小さい分量)。
2. 「今日は復習が◯件」と提示して先に消化。合格で `done`・`variant_file` を記録。

### 5. lesson フェーズ(current.phase == "lesson")
1. lesson.ipynb を VS Code で開いてもらい、上から一緒に進める。学習者がセルを実行し、チューターは:
   - 概念ブロックの「なぜ」を自分の言葉で補足する
   - 「予測」セルでは実行前に必ず予測を聞く(答えは言わない)
   - 「書いてみる」セルで詰まったらソクラテス式(チェックポイントの NG メッセージを読ませる)
2. 最後の振り返りセル(自己評価+TIL)を書いてもらう。
3. lesson 完了: `lessons` に記録、該当概念の `skills` を 2 に更新、`current.phase` を `"exercise"` へ。**git commit**(下記規約)。

### 6. 演習フェーズ(current.phase == "exercise")
1. 課題を提示: スケルトンのパス、何ができれば合格か、テストコマンド。「lesson を見ながらでOK」と伝える。**hints/ と .solutions/ は開かない。**
2. テスト実行: `python -m pytest courses/<course>/<unit>/tests/test_exNN.py -q`。不合格ごとに attempts をカウント。
3. ヒント要求時(または同一tierで3往復進展なし)は `hints/exNN.md` の**次のtierだけ**読み、噛み砕いて伝える。エラーメッセージは隠さず「1行目に何て書いてある?」と読解を促す。
4. 合格時:
   - 何ができるようになったかを一言で言語化して承認
   - `exercises` 更新、`current` を前進、該当概念の `skills` を実績で更新(tier0-1 かつ attempts<=3 なら 3)
   - つまずき判定(attempts>=4 or tier3)なら `review_queue` に +1/+3/+7/+14日の4件登録(`(Get-Date).AddDays(n).ToString("yyyy-MM-dd")`)
   - **git commit**: `git add` 該当ファイル+progress → `learn(<course>): <unit>/<ex> 合格 (attempts=N, tier=N)`

### 7. ユニット完了時
1. README のマイルストーンを一緒に確認して `milestones.checked` に記録。
2. **Feynmanチェック**: 「このユニットの核心を、C#しか知らない同僚に説明するつもりで話してみて」。説明が概ね正確なら該当 `skills` を 4 に、`feynman_passed: true`。不正確な箇所は優しく正し、レベルは3のまま。
3. ユニット単位の +7日復習を1件登録。`current` を次ユニットの lesson へ。

### 8. セッション終了(区切り: 課題2〜3問 or 30〜45分)
1. **学習ノート**を `notes/YYYY-MM-DD_<unit>.md` に生成:
   ```
   # YYYY-MM-DD <unit>
   ## 今日できたこと(Can-Do)
   ## 新しく学んだ概念
   ## つまずいた箇所と原因
   ## 質問と答えの要約(セッション中のQ&A)
   ## 次回の開始地点 / 次の復習予定
   ```
   振り返りセルの記述・attempts/tier実績・会話中の質問を素材にする。
2. `python .claude/scripts/build_skill_map.py` を実行し `progress/skill-map.json` を最新化(次コース作成時のパーソナライズ材料になる)。
3. progress・skill-map・ノートを **git commit**: `learn(<course>): セッションノート YYYY-MM-DD`。
4. 今日の成果・次回の開始地点・復習予定日を口頭で要約して締める。
