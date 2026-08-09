# unit05: テキストの正規化とTF-IDFベースライン

このユニットを終えると、Web由来の汚れた日本語・英語テキストを整え、疎なTF-IDF行列へ変換し、線形分類のCVを回せる。

## なぜ学ぶか

クロールした本文にはHTML残渣、全角半角、価格表記、定型文が混ざる。そのままでは同じ意味が別の語として数えられ、サイト由来の定型文を学習してしまうこともある。テキストを「語彙辞書 + 疎ベクトル」へ落とす工程を自分で監査できると、古典NLPの高速な基準点を作れる。

BoWはC#なら `Dictionary<string, int>` の語彙表と、非ゼロ要素だけを持つ疎配列の組に近い。vectorizerも `fit` はtrainだけ、testは `transform` だけにする。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_clean_and_normalize | HTML・Unicode・空白・価格を正規化 | 15分 |
| ex02_tokenize_and_tfidf | Janome分かち書きと疎TF-IDF | 20分 |
| ex03_linear_baseline | LinearSVCとmacro/micro-F1 | 15分 |
| ex04_capstone | PipelineをfoldごとにfitしてOOF分類 | 20分 |

`lesson.ipynb` の後、ex01から進める。例: `python -m pytest courses/kaggle-sprint/unit05-text-classical-nlp/tests/test_ex01.py -q`。

## マイルストーン

- [ ] 過剰正規化で型番を壊さず汚れを除去できる
- [ ] TF-IDFのshapeを文書数×語彙数として読める
- [ ] 疎行列をdense化せず扱える
- [ ] 不均衡分類でmacro-F1を選べる
