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
    title = soup.find(class_="post-title").get_text()
    meta_text = soup.find(class_="post-meta").get_text()
    author_part, date_part = meta_text.split(" / ")
    author = author_part.split(": ", 1)[1]
    date = date_part.split(": ", 1)[1]
    link = soup.find(class_="post-link")["href"]
    return {"title": title, "author": author, "date": date, "link": link}


# nested.html のsoupを受け取り、フロアごとの合計座席数を辞書で返す
# 例: {"floor-1": 10, "floor-2": 8}
# ヒント: 各floorのdivの中にあるclass="seat-count"のspanを全部探し、整数に変換して合計する
def count_seats_by_floor(soup):
    floors = soup.find_all("div", class_="floor")
    result = {}
    for floor in floors:
        seat_tags = floor.find_all("span", class_="seat-count")
        total = sum(int(tag.get_text()) for tag in seat_tags)
        result[floor["id"]] = total
    return result


# count_seats_by_floor() が返す辞書を受け取り、
# 座席数が最も多いフロアのidを返す(同数の場合はどちらでもよい)
def find_busiest_floor(seat_counts):
    return max(seat_counts, key=seat_counts.get)
