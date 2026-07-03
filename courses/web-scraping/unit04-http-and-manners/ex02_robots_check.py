# ex02_robots_check: robots.txtを尊重する
# robots.txtはサイト運営者が「このパスはクロールしないでほしい」と表明する紳士協定のファイルで、
# 法的拘束力はないが無視すればアクセス遮断や法的リスクにつながりうる。C#にも同種の実装はあるが、
# Python標準ライブラリにはurllib.robotparser.RobotFileParserというパーサが最初から入っている。
# ここではネットワークで robots.txt を取得する rp.read() は使わず、
# ローカルファイルの中身を rp.parse(行のリスト) に渡して同じ判定機能を再現する。

from pathlib import Path
from urllib.robotparser import RobotFileParser

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/example_robots.txt を読み込み、parse済みのRobotFileParserを返す
# (C#で言えば設定ファイルをパースしてルールオブジェクトを構築するのと同じ)
def load_robots_parser(filename="example_robots.txt"):
    path = DATA_DIR / filename
    text = path.read_text(encoding="utf-8")
    rp = RobotFileParser()
    # TODO: text を行のリストにしてrp.parse()に渡す(rp.read()はネットワークアクセスするため使わない)
    raise NotImplementedError


# 指定したUser-Agent名で指定パスにアクセスしてよいか判定する
# (C#: rp.CanFetch(userAgent, path) 相当のラッパー)
def is_allowed(rp, user_agent, path):
    # TODO: RobotFileParserのcan_fetchメソッドで判定する
    raise NotImplementedError


# 指定したUser-Agent向けのCrawl-delay(秒)を返す。指定が無ければデフォルト値を返す
def get_crawl_delay(rp, user_agent, default=1.0):
    # TODO: rp.crawl_delay(user_agent) を使い、Noneならdefaultを返す
    raise NotImplementedError
