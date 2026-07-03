# ex04_capstone: robots.txtを守り、礼儀正しくレスポンスを取得する一連の流れ
# ex01(レスポンスの扱い)・ex02(robots.txt判定)・ex03(レート制限/429対応)を組み合わせ、
# 「クロールしてよいか確認する → 取得する → 429なら待ってリトライする → 本文を返す」という、
# 実務のスクレイパーが最低限守るべき手順をひとつの関数にまとめる。
# C#で言えば複数のサービスをDIで注入して1つのユースケースを組み立てるのと同じ発想。

import sys
from pathlib import Path
from urllib.robotparser import RobotFileParser

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"

if str(DATA_DIR) not in sys.path:
    sys.path.insert(0, str(DATA_DIR))


# robots.txtのテキストからRobotFileParserを構築する(ex02と同じ役割)
def build_robots_parser(robots_text):
    rp = RobotFileParser()
    rp.parse(robots_text.splitlines())
    return rp


# user_agentがpathを取得してよいかどうかを判定する(ex02と同じ役割)
def is_allowed(rp, user_agent, path):
    return rp.can_fetch(user_agent, path)


# response が成功ならtextを返し、429なら1回だけRetry-Afterを待ってfetch_funcで再取得する。
# それ以外の失敗(404など)はNoneを返す(呼び出し元でスキップできるように例外は投げない)。
# fetch_func() は引数無しでresponseを返す関数(再取得時に呼ぶ)。
def get_body_with_retry(response, fetch_func, sleep_func, default_wait=1.0):
    if response.status_code == 429:
        wait_seconds = float(response.headers.get("Retry-After", default_wait))
        sleep_func(wait_seconds)
        response = fetch_func()

    if response.ok:
        return response.text
    return None


# robots.txtで許可されている場合のみ取得を試み、本文(またはNone)を返す。
# 許可されていなければ取得を試みずNoneを返す(=クロールしないという判断そのものが結果)。
# rp: build_robots_parser()で作ったパーサ, user_agent: 自分のBot名, path: 対象パス,
# fetch_func: 引数無しでresponseを返す関数, sleep_func: ex03と同じ依存性注入
def fetch_if_allowed(rp, user_agent, path, fetch_func, sleep_func):
    if not is_allowed(rp, user_agent, path):
        return None
    response = fetch_func()
    return get_body_with_retry(response, fetch_func, sleep_func)
