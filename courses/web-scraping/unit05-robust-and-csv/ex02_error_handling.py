# ex02_error_handling: 欠損・想定外構造への防御的処理とリトライ
# 実サイトのHTMLは要素が欠けていたり型変換に失敗したりする。C#の try/catch で例外を
# 握りつぶさずフォールバック値を返すのと同じ発想を、Pythonのtry/exceptで実践する。
# 後半はネットワーク越しの一時的な失敗に備えるリトライ(指数バックオフ+ジッタ)を扱う。
# テストで実際にsleepさせないよう、sleep関数・乱数関数を引数として注入できる設計にしてある。


# 文字列を整数に変換する。失敗したら例外を投げずdefaultを返す
# (C#: int.TryParse(s, out var v) ? v : defaultValue に相当)
def safe_int(text, default=0):
    # TODO: int(text) を試み、変換できなければ例外を握りつぶしてdefaultを返す
    raise NotImplementedError


# レコード(dict)からkeyの値を取り出す。キーが無い/値が空文字列/値がNoneのいずれでも
# defaultを返す(欠損値の統一的なフォールバック)
def extract_field(record, key, default=None):
    # TODO: record.get(key) の結果が「無い/空文字列/None」ならdefaultを返す
    raise NotImplementedError


# func()を呼び出し、例外が発生したら最大max_retries回まで再試行する。
# 再試行のたびに待機時間を「指数バックオフ+ジッタ」で伸ばす:
#   delay = base_delay * (2 ** 試行回数) + jitter_fn()
# 待機は引数の sleep_fn に delay を渡して行う(本物のtime.sleepではなくテスト用に差し替え可能にする)。
# max_retries回すべて失敗したら最後の例外を再送出する。
def retry_with_backoff(func, max_retries=3, base_delay=0.1, sleep_fn=None, jitter_fn=None):
    # TODO: func()を試し、例外時はsleep_fnで待ってから再試行する。上限を超えたら例外を送出する
    raise NotImplementedError
