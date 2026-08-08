# kaggle-sprint 生成状況と再開手順

このコースは**生成途中**。次のセッションはこのファイルを最初に読めば続きから再開できる。
最終更新: 2026-08-08

## 1. 現在の状態

| Day | ユニット | データ | lesson | lesson検証 | 演習 |
|---|---|---|---|---|---|
| 1 | unit01-competition-anatomy | ✅ | ✅ | ✅ 両方向 | ✅ 25テスト |
| 2 | unit02-validation-and-leakage | ✅ | ✅ | ✅ 両方向 | ❌ |
| 3 | unit03-gbdt-main-weapon | ✅ | ✅ | ✅ 両方向 | ❌ |
| 4 | unit04-tabular-feature-engineering | ✅(unit02と共有) | ✅ | ⚠️ 未記入側のみ | ❌ |
| 5 | unit05-text-classical-nlp | ✅ | ❌ | — | ❌ |
| 6 | unit06-entity-resolution | ✅ | ❌ | — | ❌ |
| 7 | unit07-transformer-finetune | ✅(unit05と共有) | ❌ | — | ❌ |
| 8 | unit08-image-and-pattern-basics | ✅ | ❌ | — | ❌ |
| 9 | unit09-transfer-learning-vision | ✅(unit08と共有) | ❌ | — | ❌ |
| 10 | unit10-capstone-ensemble-and-serving | ✅(横断) | ❌ | — | ❌ |
| 11 | unit11-summarization | ✅ | ❌ | — | ❌ |

**「lesson検証 両方向」の意味**: ①未記入状態で全セル実行して例外ゼロ・全チェックポイントが `[NG]`
②解答を仮置きして全セル実行して全チェックポイントが `[OK]`。①②の両方を実測済み。

**unit04 の宿題**: 解答記入側(②)が未検証。`ここに書く` セルは 8 / 16 / 24 / 32。

**データはすべて完成・検証済み。** 各 `data/make_data.py` の docstring に
**実測済みの期待値が正本として記録されている**。教材の数値はすべてこれと一致させる。

## 2. 次にやること(優先順)

1. unit04 の解答側検証(下記「検証手順」の②だけ)
2. unit05 → unit06 → unit07 → unit08 → unit09 → unit10 → unit11 の lesson 生成
3. unit02〜unit11 の演習生成(`exercise-writer`)
4. 全ユニットに `check_unit.py` + `course-reviewer`
5. `progress/kaggle-sprint.json` の初期化(`templates/progress.json.md` から。`skills` は
   `units[].concepts` を level 0 で展開)

## 3. ★セッション上限への対処(最重要の教訓)

lesson-writer を3回起動して**3回とも同じ場所で落ちた**。落ちた理由は
「**エージェントが notebook を書く前に、期待値を自分で再測定するのに予算を使い切る**」こと。
3体とも「全ての数値が再現できた。これから notebook を書く」と言った直後に停止した。

**対策: エージェントに再測定させない。** プロンプトに次を明記する:

> `data/make_data.py` の docstring に記録された数値は**すでに実測・検証済みの正本**である。
> **自分で測り直さないこと。** その数値をそのままリテラルで使って notebook を書き、
> **最後の1回の全セル実行でだけ**一致を確認せよ。測り直しは予算の無駄であり、
> 過去に3体のエージェントがこれで停止した。

あわせて **1セッションで起動するエージェントは1〜2体まで**にする。3体並列は必ず落ちた。

## 4. lesson 生成の依頼テンプレート

`lesson-writer`(opus)に渡す。`{N}` `{DIR}` を埋める。

```
courses/kaggle-sprint/{DIR}/lesson.ipynb を生成してください。このファイル1つだけです。

## 必ず先に読むもの
1. .claude/skills/create-course/templates/lesson.ipynb.md — 構造と品質規約の正本。厳密に従う。
2. courses/kaggle-sprint/unit01-competition-anatomy/lesson.ipynb — 書式の見本(承認済み・検証済み)。
   トーン・密度・セル構成・check() ヘルパー・データパスのフォールバック方式を必ず揃える。
3. 直前のユニットの lesson.ipynb — 用語と変数名を揃える。説明済みのことは繰り返さない。
4. courses/kaggle-sprint/course.json の units[{N}] の summary(詳細な仕様書)、learner_profile、runtime_policy
5. <該当データの make_data.py> の docstring — 実測値が正本
6. CLAUDE.md、courses/kaggle-sprint/README.md

## ★数値の扱い(厳守)
make_data.py の docstring の数値は実測・検証済みの正本です。**自分で測り直さないこと。**
そのままリテラルで使って notebook を書き、最後の全セル実行でだけ一致を確認してください。
測り直しは予算の無駄です(過去に3体のエージェントがこれで停止しました)。

## 技術的制約
- 完全オフライン。ネットワーク・事前学習済み重みのダウンロード禁止。
- check() ヘルパーは unit01 の lesson.ipynb から同じものを持ってくる。
- データパスは Path("data") → 無ければ Path("courses/kaggle-sprint/{DIR}/data") にフォールバック。
  (別ユニットのデータを使う場合は相対パスを調整。両経路を実測確認すること)
- 全セル合計 3分以内。重い計算は一度だけ実行して変数に保持し使い回す。
- ⑦未記入でも notebook 全体が例外で止まらないこと(最優先)。
- チェックポイントの期待値は実測値をリテラルで。乱数は random_state 固定で決定的に。

## 検証(必須)
1. nbformat で生成(JSONを手書きしない)。
2. 素の状態で nbclient 全セル実行 → 例外ゼロ、③⑤が動く、⑧が全て [NG]。
3. ⑦に解答を仮置きして全セル実行 → 全チェックポイントが [OK]。
4. 出力セルをクリアして保存(outputs=[], execution_count=None)。一時ファイル・output/ は削除。

完了したら、セル数・両方の検証結果・チェックポイント一覧・実行時間を日本語で報告してください。
```

## 5. 検証手順(orchestrator が自分で回す)

```bash
# ① 未記入で例外ゼロ・全NG
cd courses/kaggle-sprint/<UNIT> && python - <<'PY'
import nbformat as nbf
from nbclient import NotebookClient
nb = nbf.read("lesson.ipynb", as_version=4)
NotebookClient(nb, timeout=600, kernel_name="python3", allow_errors=True).execute()
errs = [o for c in nb.cells if c.cell_type=='code' for o in c.get('outputs',[])
        if o.get('output_type')=='error']
ok = ng = 0
for c in nb.cells:
    for l in "".join(o.get('text','') for o in c.get('outputs',[])).splitlines():
        ok += l.strip().startswith('[OK]'); ng += l.strip().startswith('[NG]')
print(f"例外={len(errs)} [OK]={ok} [NG]={ng}")
PY
```

② は同じスクリプトで、`ここに書く` セルの source を自分で書いた解答に差し替えてから実行し、
`[OK]` が全件・`[NG]` が 0 件になることを確認する。**エージェントの報告を鵜呑みにしない。**
`ここに書く` セルの位置は次で取れる:

```python
[i for i, c in enumerate(nb.cells) if c.cell_type=='code' and 'ここに書く' in c.source]
```

演習側は `python .claude/scripts/check_unit.py courses/kaggle-sprint <UNIT>` が
`"ok": true` を返すこと、スケルトンで pytest が失敗し `USE_SOLUTIONS=1` で通ることを実測する。

## 6. 環境の再構築

コンテナは使い捨てなので、新しいセッションでは入れ直しが要る。

```bash
pip install --break-system-packages numpy pandas scikit-learn scipy matplotlib seaborn \
    ipykernel nbformat nbclient jupyter_client pytest \
    lightgbm xgboost pillow scikit-image opencv-python-headless janome \
    torch torchvision transformers tokenizers
```

**`download.pytorch.org` はプロキシに拒否される(403)。** torch は PyPI から入れる
(CUDA版が入るが CPU で問題なく動く)。

実測済みの環境: Python 3.11 / GPUなし / 4コア / pandas 3.0.5 / lightgbm 4.7 /
torch 2.13 / transformers 5.14。

## 7. 踏んだ落とし穴(教材にも反映済み)

- **pandas 3.0 では文字列列の dtype が `object` ではなく `str`。** `df[c].dtype == object` による
  カテゴリ列判定は**外れる**。`pd.api.types.is_numeric_dtype()` の否定を使う。
- **LightGBM 4.x の `fit()` に `early_stopping_rounds` 引数は無い。**
  `callbacks=[lgb.early_stopping(50)]` を使う。
- **`TimeSeriesSplit` は先頭ブロックをどの検証にも含めない**(1661行中1380行しか検証されない)。
  OOF 配列を `np.zeros` で初期化したまま全行採点すると出鱈目な値になる(実測 RMSLE 3.83)。
  `np.full(n, np.nan)` で初期化して `~np.isnan(oof)` で採点する。
- **半角カタカナの濁点は基底文字 + `ﾞ` の2文字**。`ジ → ｼ` にすると NFKC で `シ` に戻り、
  「正規化で統合される」という前提が壊れる。
- **合成データは簡単になりすぎる。** 必ず実測して難易度を確認すること。
  画像分類は初版が HOG で 97.8% 出てしまい、背景の散らかり・遮蔽を足して 78.4% に調整した。
  ただし**回転を ±69度 まで振ると、回転した bottle が book と同じ横長矩形になり
  クラスの区別そのものが壊れる**(CNN が HOG に負けた)。±25度 に留めること。

## 8. 未解決の宿題

- **unit09 の転移学習が HOG を超えることは実測できていない。** 事前学習済み重みが
  この環境からダウンロードできないため。lesson では原理と手順を教え、演習は
  ランダム初期化でロジックを採点する設計。この制約は README にも明記済み。
  参考実測値: HOG + LinearSVC = 0.7840、色ヒストグラムのみ = 0.3533、
  スクラッチCNN(3層・30epoch) = 0.5731(小データではスクラッチが古典に負ける、
  という転移学習の動機そのものなので、この数字はそのまま教材に使える)。
- unit04 の解答側検証。
