# ex01_css_select: CSSセレクタで複数レコードを一括抽出する
# find_all(タグ名)だけでなく、CSSセレクタ文字列で「クラス名」「子孫」を直接指定できるのが
# select()/select_one()。C#で言えばLINQのWhereをXPath/CSSセレクタ1本で書けるようなもの。

from pathlib import Path
from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のHTMLファイルをBeautifulSoupで読み込んで返す
def load_soup(filename):
    path = DATA_DIR / filename
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


# soup(products.html)から、商品名(class="product-name")のテキストをすべて出現順のリストで返す
# 例: ["エチオピア モカ", "ブラジル サントス", ...]
def get_all_product_names(soup):
    return [tag.get_text(strip=True) for tag in soup.select(".product-name")]


# soup(products.html)から、価格(class="product-price")のテキストをすべて出現順のリストで返す
def get_all_product_prices(soup):
    return [tag.get_text(strip=True) for tag in soup.select(".product-price")]


# soup(products.html)から、"product-grid"の直下にある最初の商品カードの商品名テキストを返す
# ヒント: CSSの子孫結合子(半角スペース区切り)や直接の子(>)をセレクタ文字列で表現できる
def get_first_product_name(soup):
    tag = soup.select_one(".product-grid .product-name")
    return tag.get_text(strip=True)
