# ex04_capstone: ex01〜ex03の総合演習
# blog_post.html から記事情報を辞書にまとめ、nested.html から座席データを集計する。
# find/find_all/属性アクセス/テキスト取得を組み合わせて、
# 「解析(BeautifulSoup)→整形(dict/list)」のミニパイプラインを通しで書く。

from pathlib import Path

from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のHTMLファイルを読み込み、BeautifulSoupオブジェクトにして返す
def load_soup(filename):
    path = DATA_DIR / filename
    html = path.read_text(encoding="utf-8")
    return BeautifulSoup(html, "html.parser")


# blog_post.html のsoupを受け取り、以下のキーを持つ辞書を返す
# {"title": "秋の新作ブレンドができるまで", "author": "田中 美咲",
#  "date": "2026-10-02", "link": "/blog/autumn-blend"}
# ヒント: post-metaのテキストは "著者: 田中 美咲 / 投稿日: 2026-10-02" という形式。
# " / " で分割してから、それぞれ ": " で分割すると値だけ取り出せる。
def parse_blog_post(soup):
    # TODO: post-titleのテキスト、post-metaから著者/投稿日、post-linkのhref属性を取り出して辞書にする
    raise NotImplementedError


# nested.html のsoupを受け取り、フロアごとの合計座席数を辞書で返す
# 例: {"floor-1": 10, "floor-2": 8}
# ヒント: 各floorのdivの中にあるclass="seat-count"のspanを全部探し、整数に変換して合計する
def count_seats_by_floor(soup):
    # TODO: floorごとにseat-countの値を合計し、{フロアid: 合計} の辞書を作る
    raise NotImplementedError


# count_seats_by_floor() が返す辞書を受け取り、
# 座席数が最も多いフロアのidを返す(同数の場合はどちらでもよい)
def find_busiest_floor(seat_counts):
    # TODO: 辞書の値が最大のキーを返す
    raise NotImplementedError
