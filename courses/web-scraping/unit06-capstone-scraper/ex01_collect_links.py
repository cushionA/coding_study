# ex01_collect_links: 一覧ページを辿って全商品の詳細リンクを集める
# C#で言えば、ページ1つを取得するたびに「次ページへのリンク」を確認し、
# while ループで辿っていく処理に相当する(foreachで既知の全ページを回せない=件数が事前にわからない状況)。

from pathlib import Path
from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data" / "site"

BASE_URL = "https://polaris-coffee.example/"


# URL(例: BASE_URL + "list_page_1.html")を受け取り、data/site/ 内の対応ファイルを
# UTF-8で読み込んで文字列として返す「ローカルフェッチャ」。
# 本物のrequests.get(url).textの代わりに使う。差し替え可能なようにこの関数越しに全取得を行う。
def fetch(url):
    filename = url.rsplit("/", 1)[-1]
    path = DATA_DIR / filename
    return path.read_text(encoding="utf-8")


# 一覧ページのHTML文字列を受け取り、そのページに載っている商品の詳細ページURLの
# リストを返す(BeautifulSoupでa.product-linkのhrefを集める)。
# 例: ["https://polaris-coffee.example/item_1.html", ...]
def extract_item_links(list_html):
    # TODO: BeautifulSoupでパースし、class="product-link"のaタグのhrefをBASE_URLと連結して集める
    raise NotImplementedError


# 一覧ページのHTML文字列を受け取り、次ページへのURL(なければNone)を返す。
# 例: class="next-page"のaタグがあればそのhrefをBASE_URLと連結して返す
def extract_next_page_url(list_html):
    # TODO: class="next-page"のaタグを探し、あればURLを、無ければNoneを返す
    raise NotImplementedError


# 開始URL(1ページ目)から始めて、次ページが無くなるまで一覧ページを辿り、
# 全ページ分の商品詳細URLを1つのリストにまとめて返す(順序は登場順)。
# ページ取得にはfetch()を、リンク抽出には上の2関数を使う。
def collect_all_item_links(start_url):
    # TODO: start_urlから始めてページを取得し、extract_item_linksで詳細URLを集めつつ、
    # extract_next_page_urlがNoneを返すまでループする
    raise NotImplementedError
