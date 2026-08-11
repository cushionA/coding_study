# 別セッションへの引き継ぎプロンプト(kaggle-sprint 残作業)

このファイルの「## 依頼文」以下をそのまま新しいセッションに貼れば作業を引き継げる。
背景の把握用に、まず「## 現状」を読むこと。

---

## 現状(2026-08-09 時点)

全11ユニットに lesson・演習4本・テスト・3段階ヒント・解答が揃っており、
`check_unit.py` は 11/11 で `ok: true`、lesson は全11本が未記入状態で例外ゼロ・
全チェックポイント `[NG]` を実測済み。**構造的には完成している。**

残っているのは次の3件。

### 残作業1(最重要): unit10 のキャップストーンが Day1〜4 のコンペと繋がっていない

`unit10-capstone-ensemble-and-serving/lesson.ipynb` は
`LogisticRegression` / `brier_score_loss` / `StratifiedKFold` を使う **分類タスク**の
合成データで完結している。しかし Day1〜4 は **価格予測の回帰**(RMSLE・GroupKFold)であり、
**課題の種類ごと違う**。10日間の締めくくりとして、それまで育てたコンペの上で
アンサンブルを組む設計だったので、作り直しが要る。

### 残作業2: unit09 / unit11 の見出しが Day1〜8 と不揃い

Day1〜8 は「① なぜ → ② 解説 → ③ 見る → ④ 予測 → ⑤ 変えてみる → ⑥ 書いてみる →
⑦ 書く(`# ここに書く`)→ ⑧ チェックポイント」の8セル構成。
unit09 / unit11 は「### 予測」「### 変える」「STEP 5: 書く」「TODO」という別の命名になっている。
**構造自体は入っている**(予測・変える・書く・チェックは存在する)ので、
命名の統一で足りるのか、①「なぜ学ぶか = 実務のどの場面で使うか」と
⑥「書いてみる指示」が実際に欠けているのかを**まず判定**すること。
欠けているなら中身を足す。命名だけなら見出しを揃える。

### 残作業3: `reviewed: true` の裏取り

`course.json` の全ユニットに `reviewed: true` が付いているが、`course-reviewer` による
独立レビューが実際に完了したかは未確認(監査エージェントが週次上限で停止した)。

---

## ★unit10 を作り直す前に必ず読むこと(実測済みの事実)

**この節の数値はすべて実測済み。作業者は測り直さなくてよい。**
条件: `unit02-validation-and-leakage/data/` の train(1661行)/ test(330行)、
目的変数 `np.log1p(price)`、評価は log 空間の RMSE(= RMSLE)、
検証は `GroupKFold(5, groups=train["product_key"])`、
特徴量は `brand_tier, views, title_len, category, site, condition, days`
(`days` = `collected_at` の 2025-10-01 からの経過日数)。
`list_price` と `discount_rate` は**リーク列なので使わない**(test にも無い)。

| モデル | OOF (CV) | LB (未来のtest) |
|---|---|---|
| Ridge(欠損補完→標準化→one-hot の Pipeline, alpha=1.0) | **0.6378** | **0.6092** |
| LightGBM(n_estimators=500, lr=0.05, subsample=0.8, colsample=0.8) | 0.7249 | 0.6835 |
| LightGBM(時間トレンドを線形除去してから学習) | 0.7225 | 0.6771 |
| カテゴリ別中央値ベースライン | 0.7451 | 0.7739 |

- **OOF予測の相関**: Ridge–LightGBM = **0.9392**(似すぎている)
- **最適ブレンド重み(OOFで決定)**: Ridge **1.00** / LightGBM **0.00**
  → つまり **ブレンドしても改善しない**。最良は Ridge 単体。
- **シード平均(5seed, LightGBM)**: OOF 0.7225 → **0.7169**、LB 0.6771 → **0.6758**
  (効果はあるが小さい。`subsample`/`colsample_bytree` を入れないとシードを変えても
  完全に同じ木になり効果ゼロになる点は要注意)

### なぜ Ridge が圧勝するのか(根本原因。必ず理解してから設計すること)

`unit02` のデータは **対数空間で厳密に線形**に生成されている
(`make_data.py` 参照: 商品固有値 + 状態の加算 + サイト係数の対数 + 時間の線形トレンド + ガウスノイズ)。
`product_key` は特徴量に使えないので、商品固有値は説明不能なノイズになる。
**説明可能な部分は one-hot + `days` に対して完全に線形**であり、
Ridge がほぼ理論最良、木はそれを近似することしかできない。

当初「木は学習期間の外(未来)を外挿できないのが原因」と仮説を立てたが、
時間トレンドを線形除去してから木に学習させても 0.7249 → 0.7225 とほぼ改善せず、
**この仮説は棄却された**。原因は生成過程そのものの線形性である。

### したがって unit10 の設計方針(3案。作業者が選ぶ)

**案A(推奨・追加検証がほぼ不要)**: 実測どおりの事実を教材にする。
「アンサンブルは万能ではない」を主題にする。OOF で重みを決めたら片方が 0.00 になった、
という**実際に起きた結果**をそのまま見せ、
(1) OOF による重み決定は「弱いモデルを混ぜてしまう事故」を自動で防いでくれる、
(2) 予測相関 0.9392 が「そもそも混ぜる価値が薄い」ことを事前に示していた、
(3) 混ぜる前に「なぜこのモデルが弱いのか」を理解するのが先、
という3点に落とす。**負の結果を隠さず教材化するのが誠実で、実務でも役に立つ。**

**案B**: 相関の低い第3のモデルを足してブレンドを成立させる。
候補は「Ridge の残差に LightGBM を乗せる」「k-NN」「異なる特徴量セットの Ridge」。
**必ず実測して、ブレンドが単体を上回ることを確認してから採用すること。**
確認できなければ案Aに戻す。数字が出ないまま「ブレンドは効く」と書いてはいけない。

**案C**: `unit02` のデータに非線形性(交互作用)を足して木が競えるようにする。
**非推奨** — Day2/3/4 の lesson に焼き込まれた数値がすべて無効になり、
3ユニットの作り直しが発生する。

いずれの案でも、**キャップストーンは Day1〜4 のコンペデータを使って
「学習 → OOF → 重み決定 → test 予測 → submission.csv 生成」を1本に閉じること**が必須。

---

## 依頼文(ここから下を新セッションに貼る)

`courses/kaggle-sprint` の残作業を片付けてください。このリポジトリは Claude Code をチューターとする
自習教材システムで、`CLAUDE.md` に教え方の方針があります。

### 前提として読むもの(この5つだけでよい)
1. `courses/kaggle-sprint/HANDOFF_PROMPT.md`(このファイル。「現状」と「実測済みの事実」の節が要)
2. `.claude/skills/create-course/templates/lesson.ipynb.md` — lesson の構造と品質規約の正本
3. `.claude/skills/create-course/templates/exercise.py.md` / `test_exercise.py.md` / `hints.md.md` / `conftest.py.md`
4. `courses/kaggle-sprint/unit01-competition-anatomy/` の `lesson.ipynb` と `ex01`〜`ex04` — **承認済みの書式見本**
5. `courses/kaggle-sprint/course.json` の `units[9]` の `summary`、`learner_profile`、`runtime_policy`

### やること

**(1) unit10 のキャップストーンを作り直す(lesson + 演習4本)**

上の「unit10 を作り直す前に必ず読むこと」の実測値と3案を読み、**案Aを既定**として進めてください。
案Bを採る場合は、ブレンドが単体を上回ることを**必ず実測で確認**してから書くこと。

データは `courses/kaggle-sprint/unit02-validation-and-leakage/data/` を使います
(Day1〜4 と同じコンペ)。パス解決は
`Path("../unit02-validation-and-leakage/data")` → 無ければ
`Path("courses/kaggle-sprint/unit02-validation-and-leakage/data")` のフォールバックにし、
**両方の経路から動くことを実測で確認**してください(unit03/unit04 が同じ方式なので参考にする)。

lesson で扱う概念は `course.json` の `units[9].concepts`:
`oof-blending-stacking` / `seed-averaging` / `train-inference-separation` /
`inference-cost-design` / `end-to-end-workflow`。

`inference-cost-design` は学習者の実務要求に直結する部分なので特に丁寧に。
学習者の構成は「**開発 = ThinkPad(CPU)/ 学習 = クラウドGPU を時間借り / 推論 = CPU で常時**」で、
判断基準は「**既存のLLMサービスを使うより圧倒的に安価であること**」です
(勤務先はWebデータ活用の事業会社で、日次数万〜数十万件を捌く前提)。
学習コスト = GPU時間単価 × 学習時間 × 月あたり再学習回数、
推論コスト = CPU時間単価 × 稼働時間、
LLM API = 件数 ×(入力+出力トークン)× 単価、
という**非対称な式を学習者自身に計算させて損益分岐点を出させる**設計にしてください。

**(2) unit09 と unit11 の見出しを Day1〜8 に揃える**

まず「命名だけの差か、段階が実際に欠けているか」を判定してください。
①「なぜ学ぶか(実務のどの場面で使うか)」と ⑥「書いてみる指示」が無ければ**足す**。
あるなら見出しの命名を Day1〜8 の「① なぜ / ② 解説 / ③ 見る / ④ 予測 / ⑤ 変えてみる /
⑥ 書いてみる / ⑦ 書く / ⑧ チェックポイント」に揃える。
`# ここに書く` というマーカーも Day1〜8 と統一すること(現状は `TODO`)。

**(3) `course-reviewer` で unit06〜unit11 を独立レビュー**

`reviewed: true` の裏取りができていません。重大な指摘があれば直してください。

### ★作業順序の強制(これを守らないと予算切れで失敗します)

この種のタスクは過去に**5回中4回**、同じ失敗で停止しています。原因は
「notebook を書く前に、期待値を得るための探索的なコード実行を繰り返して予算を使い切る」ことでした。

**フェーズA(コードを一切実行しない)**: `gen_lesson.py`(nbformat で notebook を組み立てる
スクリプト)を最後まで書き切る。
**フェーズB(1回だけ実行)**: 実行して notebook を生成し、`nbclient` で検証する。
**フェーズC**: 落ちた箇所だけ直す。実行は最大3回まで。

チェックポイントの期待値を事前に知る必要はありません。**`gen_lesson.py` の中で
「期待値の計算」と「notebook の生成」を同時にやってください**:

```python
# gen_lesson.py の中
expected_oof = round(float(rmse(oof_ridge, y)), 4)      # ここで計算して
nbf.v4.new_code_cell(                                    # そのままリテラルとして埋め込む
    f'check("A-1 Ridge の OOF", score_ridge, {expected_oof}, hint="...")')
```

これでスクリプトを1回動かすだけで済み、対話中の探索実行がゼロになります。
**この方式を必ず採ってください。**

### 技術的制約(厳守)

- **完全オフライン**。ネットワーク・事前学習済み重みのダウンロードは禁止
  (この環境では `download.pytorch.org` も `huggingface.co` も 403 になる)
- `check()` ヘルパーは `unit01` の `lesson.ipynb` から**同じもの**を持ってくる
- **notebook の全セル合計 3分以内**。重い計算は一度だけ実行して変数に保持し使い回す
- **⑦ 未記入でも notebook 全体が例外で止まらないこと(最優先)**
- 乱数は `random_state` / `seed` を固定して決定的に
- 演習のスケルトンは `TODO` + `return None` などで**テストが必ず落ちる**状態にする。
  **スケルトンのコメントに解答コードを書かない**(`check_unit.py` が漏洩検査をする)
- テストは**期待値をリテラルで書く**。解答ロジックをテスト内で再実装して比較しない
- テストに **shape / 行数の中間アサーション**を入れる(学習者は shape の取り違えが既知のつまずき)
- ヒントは tier1(概念)→ tier2(方針)→ tier3(あと1行)の3段階。tier3 でも完全な解答は書かない
- 学習者は **C# を高レベルで習得済み・AtCoder茶色到達済み・NumPy習得済み**だが、
  **pandas / scikit-learn は level 0**。C#アナロジーを積極的に使い、初出APIには
  必ず「何をするものか」の一文と「用途 / API / 戻り値と注意」の表を添える
- 環境: Python 3.11 / GPUなし / pandas 3.0.5 / lightgbm 4.7 / torch 2.13 / transformers 5.14。
  **pandas 3.0 では文字列列の dtype が `object` ではなく `str`**(`pd.api.types.is_numeric_dtype` の
  否定で判定する)。**LightGBM 4.x の `fit()` に `early_stopping_rounds` は無い**
  (`callbacks=[lgb.early_stopping(50)]` を使う)

### 検証(必須。これをやっていない生成物は受け付けません)

1. lesson: 素の状態で `nbclient` 全セル実行 → **例外ゼロ・全チェックポイントが `[NG]`**
2. lesson: `# ここに書く` セルに解答を仮置きして全セル実行 → **全チェックポイントが `[OK]`**
3. lesson: 出力セルをクリアして保存(`outputs=[]`, `execution_count=None`)
4. 演習: スケルトンで `python -m pytest courses/kaggle-sprint/unit10-.../tests -q` が**失敗**する
   (収集エラーではなくアサーション失敗として)
5. 演習: `USE_SOLUTIONS=1` で**全て通る**
6. `python .claude/scripts/check_unit.py courses/kaggle-sprint unit10-capstone-ensemble-and-serving`
   が `"ok": true`
7. 一時ファイル・`output/`・`__pycache__` を残さない

完了したら、セル数・**両方の検証結果**・チェックポイント一覧・演習のテスト件数・
`check_unit.py` の出力を日本語で簡潔に報告してください。
**報告は短くてよいので、まず成果物を完成させることを優先してください。**

### 作業ブランチ

`claude/atcoder-bronze-learning-course-h25tth` で作業し、完了後に master へマージしてください。
コミットメッセージは `learn(kaggle-sprint): ...` または `feat(kaggle-sprint): ...` の形式。
