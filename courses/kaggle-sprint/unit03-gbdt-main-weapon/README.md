# unit03: 勾配ブースティング木を主砲にする

このユニットを終えると、scikit-learn共通APIでモデルを差し替え、LightGBMを早期終了つきで学習し、重要度を改善案へつなげられる。

## なぜ学ぶか

テーブルコンペでは、欠損や非線形な相互作用を扱えるGBDTが強い基準点になる。実務でも `fit` / `predict` という共通契約に揃えると、線形モデル・木・LightGBMを呼び出し側を変えずに比較できる。これはC#で `IEstimator` 実装をDIで差し替えるのと同じ設計だ。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_estimator_api | clone・set_params・fit・predictを共通化 | 15分 |
| ex02_lgbm_early_stopping | callback方式の早期終了と再学習 | 15分 |
| ex03_importance_vs_scaling | 重要度表とtrainだけfitする標準化 | 15分 |
| ex04_capstone | 価格回帰ベースラインを一つの関数に統合 | 20分 |

先に `lesson.ipynb` を実行し、`ex01` から順にTODOを埋める。テスト例: `python -m pytest courses/kaggle-sprint/unit03-gbdt-main-weapon/tests/test_ex01.py -q`。

## マイルストーン

- [ ] estimatorを同じ呼び出し方で差し替えられる
- [ ] LightGBM 4.xのcallbackで早期終了できる
- [ ] 重要度を因果と誤解せず改善候補として読める
- [ ] スケーリングを学習データだけでfitできる
