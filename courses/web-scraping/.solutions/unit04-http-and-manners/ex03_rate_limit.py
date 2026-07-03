# ex03_rate_limit: リクエスト間隔を守り、429に対応する
# サーバーに休みなくリクエストを送るのは迷惑行為であり、多くのサイトはCrawl-delayやレート制限で
# それをやんわり(あるいは強制的に)止めようとする。429 Too Many Requests は「送りすぎだから
# しばらく待って」というサーバーからの明示的な合図で、多くの場合 Retry-After ヘッダで待つべき
# 秒数まで教えてくれる。C#で言えば HttpClient に自前でリトライ/バックオフを実装するのと同じ話。
#
# この演習では実際に time.sleep() を呼ばない。テストで数秒待たされると学習体験が悪いのと、
# 「何秒待とうとしたか」を検証したいだけなので、sleep処理を行う関数を引数として受け取り
# (依存性注入。C#のDIコンテナに登録するデリゲートに近い)、テスト側では記録するだけの
# ダミー関数を渡して検証する。


# 前回リクエストからの経過時間(秒)が min_interval 未満なら、不足分だけ sleep_func を呼ぶ。
# now/last_called_at は time.monotonic() が返すような単調増加する秒数を想定する。
# sleep_func は「待つ秒数」を1つ受け取る関数(本番では time.sleep、テストでは記録用の関数)。
# 実際に待った秒数(待たなかった場合は0)を返す。
def wait_if_needed(now, last_called_at, min_interval, sleep_func):
    elapsed = now - last_called_at
    remaining = min_interval - elapsed
    if remaining > 0:
        sleep_func(remaining)
        return remaining
    return 0


# response が429なら、Retry-Afterヘッダの秒数だけ sleep_func を呼んでからTrueを返す(リトライすべき)。
# 429でなければ何もせずFalseを返す(リトライ不要)。
# Retry-Afterが無い場合は default_wait 秒を使う。
def handle_rate_limit(response, sleep_func, default_wait=1.0):
    if response.status_code != 429:
        return False
    wait_seconds = float(response.headers.get("Retry-After", default_wait))
    sleep_func(wait_seconds)
    return True


# 複数のURLに対して、1件処理するたびにmin_interval秒の間隔を空けながら fetch_func を呼び出す。
# fetch_func(url) は本文文字列を返す関数。sleep_func は前述と同じ依存性注入。
# clock_func は現在時刻(time.monotonic()相当)を返す引数無しの関数。
# 各URLの結果を順番通りのリストで返す。1件目の前には待たない。
def fetch_all_with_delay(urls, fetch_func, min_interval, sleep_func, clock_func):
    results = []
    last_called_at = None
    for url in urls:
        now = clock_func()
        if last_called_at is not None:
            wait_if_needed(now, last_called_at, min_interval, sleep_func)
        results.append(fetch_func(url))
        last_called_at = clock_func()
    return results
