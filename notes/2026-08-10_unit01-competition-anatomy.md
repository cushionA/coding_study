# 2026-08-10 unit01-competition-anatomy

## 今日できたこと(Can-Do)

- `train.csv` / `test.csv` / `sample_submission.csv` の役割を区別し、提出までの流れを説明できた。
- RMSLE、pandas の行・列選択、欠損・異常値・重複の検査、カテゴリ別中央値による提出を実装した。
- lesson.ipynb のチェックポイント A〜D をすべて通過した。
- `ex01_profile_and_sanity_check` に合格した(attempts=2, tier=1)。
- `ex02_align_and_clean` に合格した(attempts=3, tier=1)。
- `ex03_holdout_score` に合格し、学習用と検証用を分けて中央値ベースラインを採点できた(attempts=4, tier=1)。

## 新しく学んだ概念

### RMSLE

- `log1p` で金額差をおおよその倍率差へ変換する。
- 二乗で正負の相殺を防ぎ、平均で全件を集約し、平方根で元の対数誤差スケールへ戻す。
- `np.asarray(x, dtype=float)` を関数の入口で使うと、Python のリストと NumPy 配列を同じ処理へ正規化できる。

### pandas の基本オブジェクトと返り値

- `DataFrame` は2次元の表、`Series` はindex付きの1次元データ、`Index` は行・列ラベルの集合。
- `df["price"]` は `Series`、`df[["price"]]` は1列の `DataFrame`。
- `df.columns` は `pandas.Index`。各要素は列ラベルで、文字列とは限らないため型ヒントが広い型になる。
- `select_dtypes(include="str")` は文字列型の列だけを持つ `DataFrame` を返す。
- `describe()` は統計量を持つ `DataFrame` を返し、`.T` はその行と列を転置する。

### `loc` / `iloc` と次元

- `loc` はlabel location、`iloc` はinteger location。`loc[0]` の `0` は位置ではなくindexラベル。
- `df.loc[行条件, 列指定]` のように `[]` を使う。`loc` はメソッドではなく `_LocIndexer` を返すプロパティ。
- `_LocIndexer` は対象DataFrameを保持し、`__getitem__` / `__setitem__` でラベル指定の取得・代入を仲介する内部オブジェクト。
- 単独ラベルで1軸を指定すると次元が減る。`df.loc[0]` や `df.loc[:, "price"]` は `Series`。
- リスト形式なら次元を維持する。`df.loc[[0]]` や `df.loc[:, ["price"]]` は `DataFrame`。
- `df.loc[0, "price"]` は1セルのスカラー値。

### 条件式と代入

- Python の `and` は1個の真偽値に対する短絡評価で、複数の真偽値を持つ `Series` には使えない。
- pandas の `&` / `|` / `~` は要素ごとの論理演算。各比較条件を必ず括弧で囲む。
- `df[cond]["col"] = x` は一時オブジェクトへの連鎖代入になり、pandas 3.0 のCopy-on-Writeでは元の `df` に反映されない。
- 元の表を更新するときは `df.loc[cond, "col"] = x` と行・列を一度に指定する。
- `inplace=True` より、`df = df.drop_duplicates()` のように戻り値を明示的に受け取る。

### CSV読込と型

- `parse_dates=["listed_at"]` はCSVの文字列を日付・時刻型へ変換しながら読み込む指定。
- `dtype` は列型の指定、`converters` は独自変換、`na_values` は欠損として扱う文字列の指定。
- `description_len` のような整数列に `NaN` があると、通常のNumPy `int64`では保持できないため `float64`へ昇格する。
- 欠損可能なpandas整数型は大文字の `Int64`。`np.nan` は `None` ではなく、`float`型の特殊値。
- `NaN == NaN` は `False`。欠損判定には `isna()` / `pd.isna()` を使う。

### indexを扱うAPI

- `ignore_index=True` は元のindexを引き継がず、結果へ `0, 1, 2, ...` の新しい連番を付ける。
- `reset_index(drop=True)` も、古いindexを列へ残さず連番へ戻す用途で使う。
- SeriesをDataFrameの列へ代入すると、pandasは単純な位置ではなくindexラベルで整列する。
- testとsample submissionの対応は、`sample_submission["item_id"].equals(test["item_id"])` で確認できる。順序が不明ならIDで結合する。

### `map` と対応表

- Python標準の `map(function, iterable)` は関数が必要で、遅延評価のmapオブジェクトを返す。
- pandas の `Series.map()` は関数だけでなくdictやSeriesも受け取れる。
- `test["category"].map(cat_median)` は、各行のカテゴリ値をdictのキーとして検索し、同じindexの予測Seriesを返す。
- dictにないカテゴリは `NaN` になるため、`.fillna(MEDIAN)` などの退避先が必要。
- 全体中央値への退避は精度を保証するものではなく、未知カテゴリでも提出を壊さない最低限のベースライン。
- 未知カテゴリの精度を上げるには、brand・condition・views・説明文など他の特徴量や階層的な退避を使う。

### train / test と検証

- testの目的変数がないのは「欠損」ではなく正解が隠されているため。全test行について予測値を提出する。
- 特徴量の欠損行は無条件に削除しない。数値補完、`"unknown"`カテゴリ、欠損フラグ、欠損対応モデルなどを検討する。
- 目的変数が欠損しているtrain行は損失を計算できないため、通常の教師あり学習では除外対象になる。
- public LBはtestの一部しか採点しない。行数・ID・列名・欠損・負値などの構造上の問題は全件検査し、精度はtrain内のvalidationで測る。

### Pythonの細かな構文

- `[type(w.message).__name__ for w in caught]` の `w` は、`for w in caught` で宣言される内包表記のループ変数。
- dictに同じキーを2回書くと、後の値で上書きされる。
- `for col_name in df.columns:` の `col_name` は列ラベル。列データを得るには `series = df[col_name]` とする。
- `df["col"]` は変数ではなく、名前が文字列 `"col"` の列を指定する。
- `return`をループ内に置くと、最初の反復で関数が終了する。

## つまずいた箇所と原因

- pandasの短いメソッドチェーンは、列取得・辞書検索・欠損処理が1行に圧縮され、処理の境界が見えにくかった。
- 列名ラベルと、列データであるSeriesを混同しやすかった。
- `and`と`&`、`loc`の単独ラベルとリスト指定など、Python/pandasが返り値の次元を暗黙に変える規則があやふやだった。
- ホールドアウト分割で `df[...]` を行の位置指定に使い、数値を列名として検索する `KeyError` になった。位置で行を切るときは `.iloc` を使う。
- `(train_part, valid_part)` の契約と、実際に返すスライスの順序が逆になった。戻り値の仕様と呼び出し側の変数名を対応させる。
- `pred.loc = ...` と書き、インデクサの `loc` プロパティ自体へ代入しようとした。`map()` が返す予測Seriesを `pred` として受け取ればよい。
- `fillna()` の戻り値を受け取らないと元のSeriesは変わらないことと、RMSLEには文字列列を含むDataFrameではなく正解・予測の数値Seriesを渡すことを確認した。

## 質問と答えの要約(セッション中のQ&A)

- 対数空間の誤差は、おおよそ金額差ではなく倍率差を評価する。
- `loc`はラベル指定の専用インデクサで、行と列を同時に選択・代入できる。
- 欠損があるから即削除ではなく、欠損の意味と偏りを調べて処理を決める。
- 未知カテゴリへの全体中央値は正解の推定ではなく、予測不能時の保守的な退避値。

## 次回の開始地点 / 次の復習予定

- 次は `unit01-competition-anatomy/ex04_capstone.py` から再開する。
- ex01では列ラベルとSeriesの区別、ex02では集合差・`list.sort()`の戻り値・段階的クリーニングログを復習する。
- `ex03_holdout_score` の復習予定は 2026-08-11、2026-08-13、2026-08-17、2026-08-24。
