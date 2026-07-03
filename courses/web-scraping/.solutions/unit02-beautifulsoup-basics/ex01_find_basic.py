# ex01_find_basic: BeautifulSoupでタグを1つ探して読む
# unit01では素の文字列処理で "<h1>" を探していたが、壊れやすく応用も効かなかった。
# BeautifulSoupはHTMLをパースしてタグのツリーにしてくれるので、find()でタグ名や属性から
# 直接ノードを探せる。C#で言えばXDocument.Descendants()でXML要素を探す感覚に近い。

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


# soupから最初の<h1>タグの中のテキストを返す(前後の空白は除去する)
# 例: <h1 class="post-title">秋の新作ブレンドができるまで</h1> -> "秋の新作ブレンドができるまで"
def get_title_text(soup):
    h1 = soup.find("h1")
    return h1.get_text(strip=True)


# soupから最初に見つかったタグの「タグ名」を返す
# 例: <article class="blog-post"> が最初のタグなら "article" を返す
def get_first_tag_name(soup):
    first_tag = soup.find()
    return first_tag.name
