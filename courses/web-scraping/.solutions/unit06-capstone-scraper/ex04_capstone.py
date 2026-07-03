# ex04_capstone: ex01〜ex03を統合した一気通貫のスクレイパー
# 「robots.txtを確認する→一覧ページをページネーションで辿ってリンクを集める→
#  詳細ページを1件ずつ礼儀正しく(sleepを挟んで)取得する→整形する→CSVに書き出す」
# という実務のスクレイパーそのものの流れを、関数分割して1本にまとめる。
# C#で言えば、複数のサービスクラス(RobotsChecker/LinkCollector/DetailFetcher/CsvWriter)を
# 1つのオーケストレーターメソッドから順番に呼び出すのと同じ構造。

import csv
import urllib.robotparser
from pathlib import Path

from bs4 import BeautifulSoup

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data" / "site"

BASE_URL = "https://polaris-coffee.example/"
USER_AGENT = "PolarisScraperBot"


# URLを受け取り、data/site/ 内の対応ファイルをUTF-8で読み込んで文字列として返す「ローカルフェッチャ」
def fetch(url):
    filename = url.rsplit("/", 1)[-1]
    path = DATA_DIR / filename
    return path.read_text(encoding="utf-8")


# robots.txtの中身(文字列)を受け取り、USER_AGENTがtarget_urlを取得してよいかを判定する。
# urllib.robotparser.RobotFileParserはファイル/URL読み込み前提のAPIなので、
# ここではparse()に行のリストを渡して文字列から読み込む形にする。
def is_allowed(robots_txt, target_url):
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(robots_txt.splitlines())
    return rp.can_fetch(USER_AGENT, target_url)


# 一覧ページのHTML文字列を受け取り、そのページの商品詳細URLのリストを返す(ex01と同じ役割)
def extract_item_links(list_html):
    soup = BeautifulSoup(list_html, "html.parser")
    links = soup.find_all("a", class_="product-link")
    return [BASE_URL + a["href"] for a in links]


# 一覧ページのHTML文字列を受け取り、次ページへのURL(なければNone)を返す(ex01と同じ役割)
def extract_next_page_url(list_html):
    soup = BeautifulSoup(list_html, "html.parser")
    next_link = soup.find("a", class_="next-page")
    if next_link is None:
        return None
    return BASE_URL + next_link["href"]


# 詳細ページのHTML文字列を受け取り、生テキストのままの辞書を返す(ex02と同じ役割)
# キーはname/price/origin/roast/stock/description
def parse_item_detail(detail_html):
    soup = BeautifulSoup(detail_html, "html.parser")
    return {
        "name": soup.find(class_="item-name").get_text(strip=True),
        "price": soup.find(class_="item-price").get_text(strip=True),
        "origin": soup.find(class_="item-origin").get_text(strip=True),
        "roast": soup.find(class_="item-roast").get_text(strip=True),
        "stock": soup.find(class_="item-stock").get_text(strip=True),
        "description": soup.find(class_="item-description").get_text(strip=True),
    }


# "産地: エチオピア" のような文字列から値だけを取り出す(ex03と同じ役割)
def strip_label(text):
    if ":" in text:
        _, value = text.split(":", 1)
        return value.strip()
    return text.strip()


# "1200円" のような文字列から数値部分だけを取り出しintで返す(ex03と同じ役割)
def price_to_int(price_text):
    digits = price_text.replace("円", "").replace(",", "").strip()
    return int(digits)


# 生の詳細辞書とidを受け取り、整形済み辞書を返す(ex03のclean_itemと同じ役割)
def clean_item(item_id, raw_item):
    return {
        "id": item_id,
        "name": raw_item["name"],
        "price": price_to_int(raw_item["price"]),
        "origin": strip_label(raw_item["origin"]),
        "roast": strip_label(raw_item["roast"]),
        "stock": raw_item["stock"],
        "description": raw_item["description"],
    }


# start_urlから始めて一覧ページを辿り、全ページ分の商品詳細URLを順序通りのリストで返す。
# sleep_fnは1ページ取得後に呼ぶ関数(本物のtime.sleepの代わりにテストから注入できるようにする)。
def collect_all_item_links(start_url, sleep_fn):
    all_links = []
    current_url = start_url
    while current_url is not None:
        html = fetch(current_url)
        all_links.extend(extract_item_links(html))
        next_url = extract_next_page_url(html)
        if next_url is not None:
            sleep_fn()
        current_url = next_url
    return all_links


# 詳細URLのリストを1〜始まりのIDと対応付けながら取得・整形し、整形済み辞書のリストを返す。
# 1件取得するごとにsleep_fn(crawl_delay)を呼ぶ。取得や整形で例外が起きた場合はその1件を
# スキップし、on_errorが渡されていれば on_error(url, 例外) を呼んで処理を続ける。
def fetch_and_clean_all(item_urls, sleep_fn, crawl_delay, on_error=None):
    results = []
    for item_id, url in enumerate(item_urls, start=1):
        try:
            html = fetch(url)
            raw_item = parse_item_detail(html)
            results.append(clean_item(item_id, raw_item))
        except Exception as exc:
            if on_error is not None:
                on_error(url, exc)
        finally:
            sleep_fn(crawl_delay)
    return results


# 整形済み辞書のリストをCSVファイルに書き出す(ex03のwrite_catalog_csvと同じ役割)
def write_catalog_csv(rows, output_path):
    fieldnames = ["id", "name", "price", "origin", "roast", "stock", "description"]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


# 全体を統括する関数。robots.txtを確認し、許可されていれば一覧を巡回して詳細を集め、
# 整形してoutput_pathにCSVを書き出す。許可されていなければ何も取得せず空リストのまま
# CSVを書き出す(ヘッダのみ)。戻り値は書き出した整形済み辞書のリスト。
def run_pipeline(start_url, output_path, sleep_fn, crawl_delay=1):
    robots_txt = fetch(BASE_URL + "robots.txt")
    if not is_allowed(robots_txt, start_url):
        write_catalog_csv([], output_path)
        return []

    item_urls = collect_all_item_links(start_url, lambda: sleep_fn(crawl_delay))
    rows = fetch_and_clean_all(item_urls, sleep_fn, crawl_delay)
    write_catalog_csv(rows, output_path)
    return rows
