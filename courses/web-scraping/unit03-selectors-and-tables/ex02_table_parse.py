# ex02_table_parse: HTMLのtableを行×列の2次元データに変換する
# table > thead > tr > th でヘッダ、tbody > tr > td で各行のデータが並ぶ。
# C#で言えばDataTableに読み込んで列名でアクセスできるようにする作業に近い。

from pathlib import Path
from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のHTMLファイルをBeautifulSoupで読み込んで返す
def load_soup(filename):
    path = DATA_DIR / filename
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


# soup(table_stats.html)のthead内のth要素から、見出し文字列のリストを返す
# 例: ["月", "来客数", "売上(円)"]
def get_headers(soup):
    # TODO: theadの中のth要素をすべて選び、テキストのリストにする
    raise NotImplementedError


# soup(table_stats.html)のtbody内の各trについて、td要素のテキストのリストを作り、
# それを1行分のリストとしてまとめた「行のリスト」を返す(2次元リスト)
# 例: [["4月", "320", "486000"], ["5月", "410", "612500"], ...]
def get_rows(soup):
    # TODO: tbody内の各tr行について、td要素のテキストのリストを作り集める
    raise NotImplementedError


# get_headers()とget_rows()の結果を組み合わせ、1行=1辞書のリストに変換する
# 例: [{"月": "4月", "来客数": "320", "売上(円)": "486000"}, ...]
# C#で言えばDataRowを列名キーのDictionaryに変換するイメージ
def rows_to_dicts(headers, rows):
    # TODO: 各行をheadersとzipして辞書化し、リストにまとめる
    raise NotImplementedError
