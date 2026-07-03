# ex04_capstone: ex01〜ex03の総合演習
# dirty_records.html(汚れた入荷記録)から素朴な文字列処理でレコードを取り出し、
# クレンジング→検証(壊れたレコードのスキップ)→CSV出力までの一気通貫パイプラインを作る。
# 「取得→解析→整形→出力」というスクレイピングの全工程をこのユニットの総仕上げとして体験する。

import csv
import re
from pathlib import Path

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"

CSV_FIELDNAMES = ["name", "price", "date", "stock"]


# data/ 以下のファイルをUTF-8で読み込んで文字列として返す
def read_fixture(filename):
    path = DATA_DIR / filename
    return path.read_text(encoding="utf-8")


# --- ex01/ex02/ex03 と同じ役割のヘルパー(このcapstoneで再利用する) ---

def normalize_whitespace(text):
    stripped = text.strip(" \t\n　")
    return re.sub(r"[ 　]+", " ", stripped)


def parse_price(text):
    if not text:
        return None
    cleaned = text.strip().replace("￥", "").replace("¥", "").replace("円", "").replace(",", "").strip()
    if not cleaned:
        return None
    return int(cleaned)


def normalize_date(text):
    match = re.match(r"(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})日?", text.strip())
    if match is None:
        raise ValueError(f"日付形式を解釈できません: {text!r}")
    year, month, day = match.groups()
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"


def safe_int(text, default=0):
    try:
        return int(text)
    except (TypeError, ValueError):
        return default


# html中の<li class="record">...</li>ブロックをすべて文字列のリストで返す(出現順)
def extract_record_blocks(html):
    blocks = []
    search_from = 0
    start_tag = '<li class="record">'
    end_tag = "</li>"
    while True:
        start_idx = html.find(start_tag, search_from)
        if start_idx == -1:
            break
        start_idx += len(start_tag)
        end_idx = html.find(end_tag, start_idx)
        if end_idx == -1:
            break
        blocks.append(html[start_idx:end_idx])
        search_from = end_idx + len(end_tag)
    return blocks


# 1つの<span class="xxx">...</span>ブロック文字列から、指定class名の中身を取り出す
# 見つからない場合はNoneを返す
def extract_span(block, class_name):
    match = re.search(
        rf'<span class="{class_name}">(.*?)</span>', block, re.DOTALL
    )
    if match is None:
        return None
    return match.group(1)


# 1レコードのブロック文字列を受け取り、クレンジング済みの辞書
# {"name": str, "price": int, "date": "YYYY-MM-DD", "stock": int} を返す。
# name が空、または price が None(取得できない)の場合は「壊れたレコード」とみなし
# ValueError を送出する(呼び出し側でスキップできるようにするため)。
# ヒント: 上のextract_span/normalize_whitespace/parse_price/normalize_date/safe_intが使える
def parse_record(block):
    raw_name = extract_span(block, "name") or ""
    raw_price = extract_span(block, "price") or ""
    raw_date = extract_span(block, "date") or ""
    raw_stock = extract_span(block, "stock") or ""

    name = normalize_whitespace(raw_name)
    price = parse_price(raw_price)

    if not name or price is None:
        raise ValueError(f"壊れたレコード: name={raw_name!r}, price={raw_price!r}")

    return {
        "name": name,
        "price": price,
        "date": normalize_date(raw_date),
        "stock": safe_int(raw_stock, default=0),
    }


# html全体を受け取り、parse_recordで壊れたレコードはスキップしつつ、
# 有効なレコードのdictをリストにして返す(出現順を保つ)
def build_clean_records(html):
    records = []
    for block in extract_record_blocks(html):
        try:
            records.append(parse_record(block))
        except ValueError:
            continue
    return records


# rows(list[dict])をCSV_FIELDNAMESの順でUTF-8のCSVファイルに書き出す
def export_to_csv(rows, path):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
