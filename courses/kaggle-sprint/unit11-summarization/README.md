# unit11: 文章要約 — 抽出型と生成型

このユニットを終えると、文類似度グラフから重要文を選び、MMRで冗長性を減らし、teacher forcingとデコード、ROUGE-L、事実照合を実装できる。

## なぜ学ぶか

要約は「分類する」から「文章を選ぶ/生成する」への一歩になる。生成型は高品質になり得る一方、事実の追加と出力長に比例するコストがある。まず安価で監査可能な抽出型を基準点にし、品質・事実性・費用を同じ表で比較するのが実務的だ。

文中心性はグラフのPageRank、ROUGE-Lは競プロで使うLCSの2次元DP。unit06の類似度とunit10のコスト関数を別タスクへ再利用する。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_extractive_centrality | 文分割・類似度・中心性・順序復元 | 20分 |
| ex02_mmr_and_rouge | MMR・ROUGE-N・ROUGE-L | 20分 |
| ex03_seq2seq_teacher_forcing | 極小T5・teacher forcing・generate | 20分 |
| ex04_capstone | 事実照合・生成費用・方式選択 | 20分 |

## マイルストーン

- [ ] 抽出型要約を中心性から作れる
- [ ] MMRの関連性/多様性trade-offを説明できる
- [ ] decoder入力とlabelsの1tokenずれを理解し実T5へ渡せる
- [ ] 品質・事実性・コスト制約で方式を選べる
