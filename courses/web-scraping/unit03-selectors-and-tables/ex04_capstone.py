# ex04_capstone: ex01〜ex03の総合演習
# products.html/table_stats.html/messy_list.htmlの3つを横断し、
# 「CSSセレクタで抽出→list[dict]に整形→防御的アクセスで欠損に耐える→集計する」という
# このユニットの一連の流れを1つのパイプラインとして仕上げる。

from pathlib import Path
from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のHTMLファイルをBeautifulSoupで読み込んで返す
def load_soup(filename):
    path = DATA_DIR / filename
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


# soup(products.html)から在庫あり(class="product-stock"のテキストが"在庫あり")の商品だけを
# {"name": ..., "price": ...} の辞書のリストで返す(出現順)
# 価格は "1200円" のような文字列から円マークを除いた整数(int)にする
def get_in_stock_products(soup):
    # TODO: 商品カードを1件ずつ調べ、在庫ありのものだけ name/price(int)の辞書にして集める
    raise NotImplementedError


# soup(table_stats.html)から、月ごとの売上(円)を合計した整数を返す
# ヒント: ex02のget_headers/get_rows/rows_to_dicts相当の処理を自分で組み立てる必要がある
# (このファイルではimportしていないので、select系で直接tdを辿ってよい)
def total_sales(soup):
    # TODO: tbody内の各行から売上(円)の列を数値として取り出し合計する
    raise NotImplementedError


# soup(messy_list.html)から、name/priceの両方が揃っている項目だけを件数として数える
# (get_item_name/get_item_price相当の防御的アクセスをこの関数内で行う)
def count_complete_items(soup):
    # TODO: class="item"のうち、名前も価格も欠けていないものだけを数える
    raise NotImplementedError
