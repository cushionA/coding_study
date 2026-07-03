# ex02_findall_loop: find_allで複数タグをまとめて集める
# find()は最初の1件だけだが、find_all()は条件に合うタグを全部リストで返す。
# C#のLINQで言えば xs.Where(条件).ToList() に近い。ここでは link_list.html の
# ナビゲーションリンクを一括で集める。

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


# soup内の<a>タグをすべて見つけ、そのテキストをリストで返す(出現順)
# 例: ["ホーム", "メニュー", "焙煎日記", ...]
def get_all_link_texts(soup):
    # TODO: aタグを全部探し、各タグのテキストをリストにまとめる
    raise NotImplementedError


# soup内の<li>タグの個数を返す
def count_list_items(soup):
    # TODO: liタグを全部探して、その件数を返す
    raise NotImplementedError


# soup内の<a>タグのうち、class属性に "external" を含むものだけのテキストをリストで返す
# ヒント: find_allにはclass名で絞り込む引数がある。外部リンクは1件だけ含まれる。
def get_external_link_texts(soup):
    # TODO: class="external"を含むaタグだけを探し、テキストをリストにする
    raise NotImplementedError
