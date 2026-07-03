# ex03_records_cleanup: 欠損・class揺れのある不揃いなリストへの防御的アクセス
# 実データはmessy_list.htmlのように「あるはずの要素が無い」「クラス名が微妙に揺れている」
# ことがよくある。find/selectは見つからなければNoneを返すので、.textをいきなり呼ぶと
# C#で言うNullReferenceExceptionに相当するエラーで落ちる。ここではNoneを想定した
# 防御的な書き方を身につける。

from pathlib import Path
from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のHTMLファイルをBeautifulSoupで読み込んで返す
def load_soup(filename):
    path = DATA_DIR / filename
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


# 1件のli要素(itemタグ)を受け取り、class="item-name"のテキストを返す
# 要素が存在しない場合は "(名称不明)" を返す(欠損対策)
def get_item_name(item_tag):
    # TODO: item_tag内でclass="item-name"を探し、無ければ"(名称不明)"を返す
    raise NotImplementedError


# 1件のli要素(itemタグ)を受け取り、class="item-price"のテキストを返す
# 要素が存在しない場合は None を返す(欠損対策)
def get_item_price(item_tag):
    # TODO: item_tag内でclass="item-price"を探し、無ければNoneを返す
    raise NotImplementedError


# soup(messy_list.html)から、class="item"を持つli要素をすべて処理し、
# {"name": ..., "price": ...} の辞書のリストを返す(出現順)
# get_item_name/get_item_priceが使える。class="item item-featured"のような
# 複数クラスを持つ要素も「item」クラスを持つ要素として拾えることに注意
def collect_items(soup):
    # TODO: class="item"の要素をすべて選び、name/priceの辞書のリストにする
    raise NotImplementedError
