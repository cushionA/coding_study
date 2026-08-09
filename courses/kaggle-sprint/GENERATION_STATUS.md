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
