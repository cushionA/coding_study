# ex02_fetch_details: 詳細ページを取得して1商品分のフィールドを取り出す
# ex01で集めたURLのリストを1件ずつ「取得→解析」するステップ。
# C#で言えば、IDのリストを受け取ってDB/APIから1件ずつレコードを取得するループに近い。

from pathlib import Path
from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data" / "site"

BASE_URL = "https://polaris-coffee.example/"


# URLを受け取り、data/site/ 内の対応ファイルをUTF-8で読み込んで文字列として返す(ex01と同じ役割)
def fetch(url):
    filename = url.rsplit("/", 1)[-1]
    path = DATA_DIR / filename
    return path.read_text(encoding="utf-8")


# 詳細ページのHTML文字列を受け取り、以下のキーを持つ辞書を返す(値は加工せず生のテキストのまま)
# {"name": "エチオピア モカ", "price": "1200円", "origin": "産地: エチオピア",
#  "roast": "焙煎度: 浅煎り", "stock": "在庫あり", "description": "..."}
# class名はitem-name/item-price/item-origin/item-roast/item-stock/item-description
def parse_item_detail(detail_html):
    # TODO: BeautifulSoupでパースし、各class要素の.get_text(strip=True)を辞書に詰める
    raise NotImplementedError


# 詳細URLのリストを受け取り、1件ずつfetch→parse_item_detailした結果をリストで返す。
# 順序はitem_urlsと同じ順を保つ。
def fetch_all_item_details(item_urls):
    # TODO: item_urlsを1件ずつ処理し、parse_item_detailの結果をリストに集める
    raise NotImplementedError
