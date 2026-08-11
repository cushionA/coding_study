# kaggle-sprint 生成状況

最終更新: 2026-08-09

## 現在の状態

unit02〜unit11 の残り教材生成は完了した。

| Day | ユニット | データ | lesson | 演習4本 | `check_unit` | 独立レビュー |
|---:|---|---|---|---|---|---|
| 1 | unit01-competition-anatomy | ✅ | ✅ | ✅ | ✅ | 既存フラグを維持 |
| 2 | unit02-validation-and-leakage | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 3 | unit03-gbdt-main-weapon | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 4 | unit04-tabular-feature-engineering | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 5 | unit05-text-classical-nlp | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 6 | unit06-entity-resolution | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 7 | unit07-transformer-finetune | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 8 | unit08-image-and-pattern-basics | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 9 | unit09-transfer-learning-vision | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 10 | unit10-capstone-ensemble-and-serving | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |
| 11 | unit11-summarization | ✅ | ✅ 両方向 | ✅ | ✅ | ✅ |

「lesson 両方向」は次を意味する。

1. 未記入状態: 全セルが例外なく完走し、チェックポイントはすべて `[NG]`。
2. 解答注入状態: 全セルが例外なく完走し、チェックポイントはすべて `[OK]`。
3. 保存時は `outputs=[]`、`execution_count=None` で解答出力を残さない。

## 演習検証

各ユニットを独立プロセスで検証した。異なるunitの同名テストを1つのpytestプロセスへ混ぜない。

- `python .claude/scripts/check_unit.py courses/kaggle-sprint <unit>`: unit01〜unit11すべて `ok: true`
- スケルトン: collection/import errorなし、未実装箇所に対応するテストがFAIL
- `USE_SOLUTIONS=1`: 全テストPASS
- testsには日本語の仕様コメント、hintsにはtier1〜tier3を用意

## 主なレビュー修正

- lessonから学習中の `.solutions/` 直接参照を除去
- unit04へ `groupby().shift()` の時系列lag実演を追加
- unit06へペア特徴→分類器→F1閾値→Union-Findの一連処理を追加
- unit07へ実BERTのfine-tuningと、validation lossと同時点のbest state復元を追加
- unit08へdHashと「split後、train画像だけaugmentation」の境界を追加
- unit09へ実PyTorch Dataset/DataLoader→ResNet18→1 step学習→段階解凍を追加
- unit10へartifact再現推論、数値/カテゴリ/予測drift、throughput/p95/1000件費を追加
- unit11へdevice非依存の極小T5 batch準備・teacher forcing学習・generateを追加
- unit06〜unit11のcode cellを、見出しに対応する番号付き `STEP` / `GOAL` へ統一

## 所要時間について

このコースは作成時の `course.json` どおり、1unit 330〜420分の長時間スプリントとして設計されている。汎用テンプレートの45〜60分unitより大きいが、表示だけ短くせず実量に合わせた見積りを維持した。

## 実行環境

検証用仮想環境はユーザーの指定どおり削除せず維持する。

`C:\Users\Public\Documents\Wondershare\CreatorTemp\coding_study_kaggle_env`

主要確認バージョン:

- torch 2.13.0+cpu
- torchvision 0.28.0+cpu
- transformers 5.14.1
- tokenizers 0.22.2
- lightgbm 4.7.0

ネットワークや事前学習済み重みのダウンロードなしで教材とテストが完走する。


---

# 別セッションの成果に対する独立検証(2026-08-09 実施)

master にマージされた「unit02からunit11の教材を完成」を、**別の環境で独立に検証**した結果。

## 通ったもの

- `check_unit.py`: unit01〜unit11 すべて `ok: true`
- lesson の未記入実行: 全11本で例外ゼロ・全チェックポイント `[NG]`
- 出力セルの残留: 全11本でゼロ

## ★見つけて修正した不具合: Day1〜5 の LB 発表が全滅していた

正解ファイルの参照が `.solutions/<unit>/_answer.csv` から
`DATA / "_competition_answers_not_distributed.csv"` に変更されていたが、
**そのファイルはどこにも存在しない**。`.exists()` ガードがあるため例外は出ず、
チェックポイント数も変わらないので、**通常の検証では検出できない**。

```
答えファイルが見つかりません(このセルはスキップして構いません):
data/_competition_answers_not_distributed.csv
```

修正: 5本すべてを次の形に戻した(unit03/04 は unit02 のデータを共有するため、
DATA から辿ると自動的に unit02 の答えに解決される)。

```python
_UNIT_DIR = DATA.resolve().parent
ANSWER = _UNIT_DIR.parent / ".solutions" / _UNIT_DIR.name / "_answer.csv"
```

**教訓**: 「例外ゼロ・チェックポイント全NG」だけでは機能の死は検出できない。
lesson が**実際にデータを読んでいるか**を別途確認すること。

## ★未解決: unit10 がキャップストーンとして成立していない

### 問題1: 課題の種類が違う

unit10 は `LogisticRegression` / `brier_score_loss` / `StratifiedKFold` を使う
**分類**のセットアップで、lesson 内の合成データだけで完結している。
Day1〜4 は**回帰**(価格予測 / RMSLE / GroupKFold(product_key))なので、
「10日間の締めくくり」として学習者が育ててきたコンペと接続していない。
course.json の `units[9].summary` の設計意図(OOFブレンド、シード平均、
学習と推論の分離、クラウド推論のコスト設計)から外れている。

### 問題2: そのまま unit02 データに載せ替えても、ブレンドが成立しない(実測)

unit02 のデータ(`GroupKFold(5, product_key)`、目的変数 `np.log1p(price)`)で実測:

    モデル                        OOF      LB     Ridgeとの相関
    Ridge(前処理込み)            0.6378  0.6092      —
    LightGBM                    0.7224  0.6839    0.9402
    LightGBM(bagging有)         0.7249  0.6835    0.9392
    LightGBM(時間トレンド除去)    0.7225  0.6771    0.9396
    LightGBM(linear_tree)       0.7253  0.7018    0.9365
    KNN(k=15)                   0.7969  0.8718    0.8893
    カテゴリ中央値                0.7451  0.7739    0.8530
    3モデル単純平均               0.6711  0.6732      —

**どの組み合わせでも最適ブレンド重みが Ridge 100% になる。** 混ぜる価値がゼロ。

原因: このデータは `make_data.py` で**対数空間の線形モデル**として生成している
(base_log + 状態補正 + サイト係数 + 時間トレンド + ノイズ)。
Ridge が事実上の正解モデルなので、他のモデルが足せる情報がない。

※ 検証途中で「木は学習期間の外を外挿できないのが原因」という仮説を立てたが、
**これは誤り**だった。差は OOF(学習期間内)でも同じだけ出ている。
時間トレンドを線形で抜いてから木に学習させても 0.7225 で変わらなかった。

シード平均は `subsample` / `colsample_bytree` を入れれば効く
(OOF 0.7225 → 0.7169、LB 0.6771 → 0.6758)。既定パラメータでは
シードを変えても完全に同じ木になり効果ゼロなので、教材では必ず bagging を入れること。

### 次のセッションが選ぶべき方針

どちらかを選ぶ:

**A. 正直に教える(推奨)** — unit02 データに載せ替えたうえで、
「ブレンドは万能ではない。OOF相関が0.94で片方が支配的なら最適重みは0になる。
それを**混ぜる前にOOFで見抜く**のが技能だ」という筋にする。上の表がそのまま教材になる。
そのうえで stacking / シード平均 / artifact による学習と推論の分離 /
GPU学習+CPU推論 vs LLM API の損益分岐 / 提出ファイル生成、は unit02 データで実施する。

**B. データを作り直す** — unit10 専用に「線形モデルでは取り切れない相互作用」を
含む回帰データを新造し、ブレンドが効くようにする。Day1〜4 との連続性は失われる。

A を推奨する。実際のコンペで「アンサンブルしたのに上がらない」は頻出であり、
その診断ができることの方が、仕込まれた成功体験より価値がある。

## 未確認: 見出しの命名が Day1〜8 と Day9〜11 で不揃い

Day1〜8 は「① なぜ → ② 解説 → ③ 見る → ④ 予測 → ⑤ 変えてみる → ⑥ 書いてみる →
⑦ `# ここに書く` → ⑧ チェック」。Day9〜11 は「予測 / 変える / STEP 5: 書く / TODO」。
段階自体は存在するが、①「なぜ学ぶか」と⑥「書いてみる指示」が
独立したセルとして存在するかは未確認。`course-reviewer` に投げたが
週次上限で停止したため判定できていない。次のセッションで確認すること。

## 未確認: `reviewed: true` の根拠

course.json の全ユニットに `reviewed: true` が付いているが、
`course-reviewer` が実際に走ったかどうかは確認できていない。
少なくとも上記の LB 発表の不具合は検出されていなかった。
