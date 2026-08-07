# Kaggleスプリント: 10日で一人前の入り口 (kaggle-sprint)

夏季休暇10日間・1日6〜8時間のカンヅメで、Kaggle のテーブル・NLP・画像コンペを「自分の手で最後まで回せる」状態に到達するコース。全11ユニット構成で、**Day1〜10 が休暇中のカンヅメ、Day11(文章要約)は休暇明けの追加ユニット**。

## コース目標

**テーブル・NLP・画像のいずれの課題でも、リークのないCV設計 → ベースライン → 改善サイクル → 提出ファイル生成 を自力で回せる。かつ同じ流れを実務のクラウド環境にコスト意識をもって載せられる。**

## 「AtCoder茶色相当」を Kaggle 文脈でどう定義したか

AtCoder 茶色は「典型問題の型を知っていて、時間内に自力で通せる」レベル。競技の頂点ではないが、**一人前の入り口**であり、実務で「あの人はコード書ける」と言われる最初のライン。これを Kaggle に翻訳すると次になる。

| AtCoder 茶色 | Kaggle での対応物 |
|---|---|
| 典型アルゴリズムの引き出しがある | ベースラインの型(GBDT / TF-IDF+線形 / 転移学習)を持っている |
| 自分の解が正しいか、提出前に判断できる | **リークのない CV を自分で設計でき、手元スコアを信じられる** |
| TLE / WA を見て原因を切り分けられる | CV と LB の乖離、過学習、リークを切り分けられる |
| 通るまで自力で詰められる | 改善サイクル(仮説→特徴量/モデル変更→CV検証)を自力で回せる |
| 提出して AC を取る | **submission.csv をフォーマット違反なく生成できる** |

つまりこのコースのゴールは **メダル獲得やSOTA追求ではない**。「金メダルは取れないが、コンペに参加して自分の力でスコアを積み上げ、何をやっているか説明できる」状態を作る。そして実務要求として、同じモデルを**クラウド上でコストを見積もりながら動かせる**ところまでを含める。

### 到達したときにできること(チェックリスト)

- コンペのデータ一式を受け取り、構造と評価指標を読み解いて、その日のうちに妥当な submission を出せる
- データの生成過程(グループ構造・時間構造)に合わせて splitter を選び、OOF 予測を自分で組める
- target leakage / group leakage / 前処理リークを検出し、修正できる
- LightGBM を early stopping 込みで回し、特徴量エンジニアリングで CV を押し上げられる
- 日本語・英語のテキストを正規化・分かち書き・TF-IDF 化し、線形モデルのベースラインを立てられる
- サブワード分割・埋め込み・pooling を理解し、Transformer のファインチューニングループを自分で書ける
- 画像を NumPy 配列として自在に扱い、古典特徴のベースラインから転移学習まで橋渡しできる
- 複数モデルの OOF をブレンド/スタックし、学習と推論を分離した再現性のあるパイプラインを組める
- 推論構成(モデルサイズ・バッチ・CPU/GPU・混合精度)を変えたときのコストとレイテンシを見積もり、根拠をもって選べる
- 表記ゆれのあるレコード群を名寄せし、「同じ実体か」を根拠つきで判定できる
- 文章を抽出型・生成型の両方で要約でき、抽出型 / 自前小型モデル / LLM API の三択をコストと事実性で選び分けられる

## 日割り表(Day1〜10 = 休暇中、Day11 = 休暇明け)

| Day | ユニット | この日の終わりに作れるようになるもの | 目安 |
|---|---|---|---|
| 1 | unit01-competition-anatomy | **初日に submission.csv を出す。** コンペ一式の読解、pandas での読込・列選択・欠損処理、提出フォーマット検証 | 360分 |
| 2 | unit02-validation-and-leakage | 信じられる CV。KFold/Stratified/Group/TimeSeries の選択、OOF 予測、4種類のリークの検出と修正、回帰指標 | 330分 |
| 3 | unit03-gbdt-main-weapon | テーブルの主砲。sklearn estimator API の型、LightGBM + early stopping、特徴量重要度、前処理が要るモデル/要らないモデル | 330分 |
| 4 | unit04-tabular-feature-engineering | スコアを押し上げる特徴量。カテゴリエンコーディング、リーク安全な OOF target encoding、groupby 集約特徴、日付特徴、Pipeline/ColumnTransformer | 360分 |
| 5 | unit05-text-classical-nlp | テキスト分類のベースライン。正規化、janome で日本語分かち書き、BoW/TF-IDF/n-gram、線形モデル、分類レポートの読み方 | 360分 |
| 6 | unit06-entity-resolution | **名寄せ(エンティティ解決)。古典→深層の橋。** 候補ペア生成(blocking)、編集距離DPの自力実装、Jaccard、TF-IDFコサイン、SVD(LSA)、mask 付き mean pooling、ペア二値分類と連結成分クラスタリング | 390分 |
| 7 | unit07-transformer-finetune | Transformer のファインチューニング一式。collate/動的パディング、attention mask、warmup+decay スケジュール、学習ループ、過学習の見分けと最良重み復元 | 420分 |
| 8 | unit08-image-and-pattern-basics | 画像を配列として扱う力。HWC/CHW・BGR・dtype、リサイズと正規化、HOG など古典特徴、データ拡張が効く理由 | 330分 |
| 9 | unit09-transfer-learning-vision | 転移学習で画像分類。Dataset/DataLoader 自作、ヘッド差し替えと凍結、段階的解凍、混同行列でのクラス別分析、TTA | 390分 |
| 10 | unit10-capstone-ensemble-and-serving | **キャップストーン。** OOF ブレンド/スタッキング、シード平均、学習と推論の分離と再現性、クラウド推論のコスト設計 | 420分 |
| — | — | *— ここまでが夏季休暇の10日間 —* | |
| 11 | unit11-summarization | **文章要約(休暇明け)。** 抽出型(文分割・中心性・MMR)、生成型(encoder-decoder・teacher forcing・デコード戦略)、ROUGE とその限界、ハルシネーション検知、三択の意思決定 | 420分 |

各ユニットは課題4個構成(micro → variant → medium → capstone の難易度勾配)。ただし **micro であってもコンペの部品として意味のあるもの**にしてあり、「文法練習のためだけの課題」は入れていない。合計の目安は Day1〜10 で約 61.5 時間(10日 × 6〜7時間)、Day11 を加えて約 68.5 時間。

## 前提と教え方の方針

### 前提として使うもの

- **C#(高レベル)・OOP・AtCoder茶色相当のアルゴリズム** — 全ユニットで C# アナロジーを積極的に使う。`DataFrame` = 「`List<匿名型>` に LINQ を生やして列方向にも切れるようにしたもの」、`groupby().agg()` = `GroupBy` + `Select(g => new {...})`、sklearn の estimator = 「共通インターフェースを実装したクラス群を DI で差し替える」、`Dataset`/`DataLoader` = `IReadOnlyList<T>` と `IEnumerable<T[]>`、といった対応表を随時出す。
- **NumPy(習得済み)** — `numpy-vectorize` / `numpy-masking` はレベル4、`numpy-broadcasting` はレベル3。**NumPy 専用ユニットは作っていない。** 代わりに「既習のブールマスクがそのまま `df[条件]` に効く」「画像の正規化は既習のブロードキャストそのもの」と、その場で接続する。

### pandas / scikit-learn は「実戦の中で都度解説する」

**pandas 専用ユニット・scikit-learn 専用ユニット・Python 文法専用ユニットは、このコースには存在しない。**

学習者本人の方針(「基礎だけダラダラやるのはモチベが持たないと分かった。やりながら調べる」)に従い、**コンペを解く文脈の中で、必要になった API をその場で丁寧に解説する**構成にした。Day 1 から submission.csv を作り、そのために必要な `read_csv` / 列選択 / `isna()` / `fillna()` / `to_csv` をそこで学ぶ。`groupby` は Day 4 で集約特徴を作るために学ぶ。Pipeline は Day 4 で「前処理リークを構造的に防ぐ道具」として学ぶ。

ただし pandas・sklearn の習熟度は実際にゼロなので、**手抜きはしない**。初出の API には必ず「何をするものか」の一文を添え、有効だった説明スタイル(**用途 / API / 戻り値と注意 の表**、**テキスト図**、**C# との対応表**)を使う。Python 文法(内包表記・dict・文字列操作)は TypeScript コースの `map`/`filter`/`Record` からの翻訳として1〜2分で導入する。

### shape と axis は毎回 print して確認する

過去のつまずき(2026-07-13 の学習ノート)で、**配列の形と軸の取り違え・`keepdims` の見落とし**が繰り返し原因になっている。このコースでは形状が絡むすべての場面で「**まず `shape` を print する**」手順を lesson・演習・テストに一貫して埋め込んでいる。特に山場は次の3か所で、いずれも意図的にそこを踏ませる設計にしてある。

- Day 6: `(batch, seq_len, dim)` の埋め込みに `(batch, seq_len)` のマスクを掛ける mean pooling(`mask[:, :, None]` と `keepdims=True` の分母)
- Day 7: attention mask を `(batch, seq)` から `(batch, 1, 1, seq)` へブロードキャストする
- Day 8: 画像の `(H, W, C)` ↔ `(C, H, W)` 変換と、チャネル毎正規化(`axis=(0,1), keepdims=True`)
- Day 11: teacher forcing の shift right と、pad 位置を `-100` にして損失から除外する `labels` の作り方

### 競技プログラミングの既習知識をそのまま使う場所

アルゴリズムの再教育はしないが、**すでに持っている実装力が直接効く場所**が3つある。ここは「知らないことを学ぶ」のではなく「知っていることが別分野で武器になる」体験になる。

- Day 6: レーベンシュタイン**編集距離を2次元DPで自力実装**する(競プロで書いたことのあるDPそのもの)
- Day 6: 名寄せ結果のクラスタ化に**Union-Find / BFS による連結成分**を使う
- Day 11: **ROUGE-L = 最長共通部分列(LCS)**なので、これもDPで自力実装する

## 進め方(各ユニット共通の3ステップ)

1. `/study` でセッションを開始する。チューターが背景と今日のゴールをガイダンスしてくれる。
2. **README → lesson.ipynb → 演習** の順に進む:
   - `README.md` — なぜ学ぶかの地図(3分)
   - `lesson.ipynb` — 概念を「読む→予測する→変えてみる→書いてみる」で身につける(90〜120分)。チェックポイントセルが即時採点してくれる
   - `exNN_*.py` — テスト駆動の演習。TODO を埋めて `python -m pytest <unit>/tests/test_exNN.py -q` が通れば合格。lesson を見ながらで OK
3. 詰まったら Claude に聞く(段階的にヒントをくれる。いきなり答えは来ない)。

課題は前から順に(後半ほど難しくなる)。合格ごとに自動でコミットされ、学習履歴が残る。セッション終了時には学習ノートが `notes/` に生成される。

1日1ユニットのペースだが、**Day 7 と Day 10 は重い**(420分)。時間が足りない日は capstone を翌朝に回してよい。逆に Day 2・Day 3・Day 8 は軽め(330分)なので、そこで巻き返せる。Day 11 も 420分だが休暇明けなので、週末や数日に分けて進めてよい。

## 環境とライブラリ

- Python 3.11
- **表・数値**: numpy / pandas / scipy / scikit-learn / lightgbm / xgboost
- **可視化**: matplotlib / seaborn
- **NLP**: janome(日本語形態素解析・純Python)、scikit-learn の `TfidfVectorizer` / `TruncatedSVD`
- **画像**: pillow / scikit-image / opencv-python-headless
- **深層学習**: torch / torchvision(Day 7・9・10・11 で使用)、transformers(Day 7・11。**極小モデルを config から構築するので重みのダウンロードは不要**)
- **テスト**: pytest

> **注意(pandas 3.0 系)** — Copy-on-Write が既定になり、chained assignment(`df[cond]['col'] = x`)が効かない/文字列列の既定 dtype が `object` ではなく `str` になっている。ネット上の Kaggle ノートブックは pandas 1.x / 2.x 前提のものが多いため、Day 1 で差分を表にして先に潰す。
>
> **注意(LightGBM 4.x)** — sklearn API の `fit()` に `early_stopping_rounds` 引数は存在しない。`callbacks=[lgb.early_stopping(50)]` を使う。Day 3 で扱う。

### 全課題が完全オフライン・CPU で完走する

**外部ネットワーク・Kaggle API・外部データセットのダウンロード・事前学習済み重みのダウンロードに依存する演習は一つもない。** データはすべて `np.random.default_rng(seed=...)` による合成データか、ユニット内に同梱した小さな固定ファイル。

深層学習のユニット(Day 6・7・9・11)も例外ではない。事前学習済みモデルが必要な処理は、**config から構築したランダム初期化の極小モデル**や**seed 固定の疑似埋め込み行列**に差し替え、採点対象は collate・attention mask・学習率スケジュール・学習ループ・凍結・混同行列・TTA・teacher forcing・デコードループといった**ロジック側**にしてある。`lesson.ipynb` では実モデル(Hugging Face の事前学習済み Transformer、torchvision の重み付き ResNet 等)の使い方も解説するが、**ダウンロードを伴うセルはすべてオプション扱い**で、飛ばしても後続セルが極小モデルで動く。

実行時間は実測済み(このコースの検証環境: Python 3.11 / 4コア / GPUなし):

| 処理 | 実測 |
|---|---|
| 極小BERT(2層・hidden 32)の前向き計算 | 0.01秒 |
| `resnet18(weights=None)` の推論(8枚) | 0.18秒 |
| 極小T5(57Kパラメータ)の学習20ステップ | 0.63秒 |
| 同・`generate(num_beams=3)` | 0.08秒 |
| LightGBM(500件・50本) | 0.04秒 |

これにより、全ユニットの演習は CPU のみで数秒〜数十秒で完走する。**実用的な精度や要約文が出るわけではなく、学ぶのは仕組み**である点は各ユニットの lesson で明示する。
