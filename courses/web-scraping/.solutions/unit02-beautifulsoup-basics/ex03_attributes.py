# ex03_attributes: 属性の読み取りと親子・兄弟ナビゲーション
# タグのテキストだけでなく、id/class/hrefのような属性値も欲しいことが多い。
# BeautifulSoupではタグを辞書のように扱って属性を取り出せる(C#の Dictionary の
# インデクサ/TryGetValue に近い)。また .parent や .find_next_sibling() で
# ツリー上を親子・兄弟方向に辿れる。

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


# soup内の<div class="floor">タグをすべて見つけ、それぞれのid属性をリストで返す(出現順)
# 例: ["floor-1", "floor-2"]
def get_floor_ids(soup):
    floors = soup.find_all("div", class_="floor")
    return [floor["id"] for floor in floors]


# id属性の値を1つ指定して、その<div class="section">タグの中にある
# class="section-name"のテキストを返す
# 例: get_section_name(soup, "section-window") -> "窓際席"
# ヒント: find()にはid指定用の引数がある。見つけたタグの「子孫」から次に探せばよい。
def get_section_name(soup, section_id):
    section = soup.find("div", id=section_id)
    name_tag = section.find("span", class_="section-name")
    return name_tag.get_text()


# id属性の値を1つ指定して、その<div class="section">タグと「兄弟関係」にある
# 次のsectionタグのid属性を返す(同じfloor内の次のセクション)
# 兄弟がなければNoneを返す
# 例: get_next_section_id(soup, "section-window") -> "section-counter"
#     get_next_section_id(soup, "section-counter") -> None
def get_next_section_id(soup, section_id):
    section = soup.find("div", id=section_id)
    next_section = section.find_next_sibling("div", class_="section")
    if next_section is None:
        return None
    return next_section["id"]
