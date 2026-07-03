# ex03_html_skim: 素朴な文字列処理でHTMLの断片を拾う
# まだBeautifulSoupは使わない(それはunit02の仕事)。ここではHTMLも所詮は文字列である
# ことを体感し、素朴な文字列処理がなぜ壊れやすいかを後のユニットと比較するための土台にする。
# C#で言えば、XMLをXDocumentでパースせずstring.IndexOf/Substringで頑張る状態に近い。

from pathlib import Path

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のファイルをUTF-8で読み込んで文字列として返す
def read_fixture(filename):
    path = DATA_DIR / filename
    return path.read_text(encoding="utf-8")


# HTML文字列から、開始タグ・終了タグに挟まれた最初のテキストを取り出す
# 例: extract_between(html, "<h1>", "</h1>") -> "喫茶ポラリス"
# タグが見つからない場合は None を返す
def extract_between(html, start_tag, end_tag):
    # TODO: start_tagの直後からend_tagの直前までを取り出す(見つからなければNone)
    raise NotImplementedError


# HTML文字列中の <a href="..."> のURL部分だけをリストで返す(出現順)
# 例: '<a href="/menu">...' -> "/menu" を集める
# ヒント: 1つずつ "href=\"" を探して、次の " まで切り出すのをループで繰り返す
def extract_href_list(html):
    # TODO: href="..." のURL部分を出現順にすべて集める
    raise NotImplementedError


# HTML文字列から <p>...</p> の段落テキストをすべてリストで返す(出現順)
def extract_paragraphs(html):
    # TODO: <p> と </p> のペアを順番に探して中身をリストに集める
    raise NotImplementedError
