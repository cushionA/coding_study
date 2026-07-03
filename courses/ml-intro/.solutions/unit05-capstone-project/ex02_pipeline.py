# ex02_pipeline: 前処理をPipelineでまとめる
# ex01では補完・スケーリングを個別の関数として書いたが、実務では
# 「補完→スケーリング→(モデル)」を1つのオブジェクトにまとめて使う。
# C#で言えば、複数の処理ステップを1つのパイプライン(責務が明確な処理の連結)にまとめる発想。

from sklearn.datasets import load_wine
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# 「欠損補完(平均) → 標準化」の2段階からなるPipelineを作って返す
# Pipeline は [(名前, transformer), ...] のリストで各ステップを渡す
def build_preprocess_pipeline():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="mean")),
        ("scaler", StandardScaler()),
    ])


# 特徴量Xと正解ラベルyを、学習用とテスト用に分割して返す
# 戻り値は train_test_split と同じ順序: (X_train, X_test, y_train, y_test)
# test_size と random_state を指定して再現性を持たせる
def split_data(X, y, test_size=0.2, random_state=0):
    return train_test_split(X, y, test_size=test_size, random_state=random_state)


# Pipelineを学習データにfitさせ、学習データとテストデータの両方を変換した結果を返す
# 戻り値は (X_train_transformed, X_test_transformed)
# 注意: テストデータには fit_transform ではなく transform を使う(学習時の統計量を使い回す)
def fit_transform_split(pipeline, X_train, X_test):
    X_train_t = pipeline.fit_transform(X_train)
    X_test_t = pipeline.transform(X_test)
    return X_train_t, X_test_t
