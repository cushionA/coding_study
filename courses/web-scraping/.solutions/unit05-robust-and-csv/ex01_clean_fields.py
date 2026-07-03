# ex01_clean_fields: 文字列クレンジング(空白正規化・通貨表記除去・日付正規化)
# 実サイトから拾った値は「全角/半角空白が混在」「通貨記号やカンマ付き」「日付の表記が
# ページごとに違う」といった汚れが必ずある。C#で言えば外部APIのレスポンスをDTOに
# マッピングする前にバリデーション・正規化をかける工程に相当する。

import re


# 前後の空白(全角スペース含む)を取り除き、内部の連続空白は半角スペース1つにまとめる
# 例: "  エチオピア  イルガチェフェ " -> "エチオピア イルガチェフェ"
# 例: "グアテマラ　アンティグア" -> "グアテマラ アンティグア"(全角スペースも対象)
def normalize_whitespace(text):
    stripped = text.strip(" \t\n　")
    return re.sub(r"[ 　]+", " ", stripped)


# "￥1,200" や "980円" のような文字列から通貨記号・カンマを取り除き、整数を返す
# 空文字列やNoneが渡された場合は None を返す(欠損値のフォールバック)
def parse_price(text):
    if not text:
        return None
    cleaned = text.strip()
    cleaned = cleaned.replace("￥", "").replace("¥", "").replace("円", "")
    cleaned = cleaned.replace(",", "").strip()
    if not cleaned:
        return None
    return int(cleaned)


# "2024/1/5" "2024-01-10" "2024年1月15日" のような表記揺れの日付文字列を
# "YYYY-MM-DD" 形式(月日はゼロ埋め)に正規化する
def normalize_date(text):
    match = re.match(r"(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})日?", text.strip())
    if match is None:
        raise ValueError(f"日付形式を解釈できません: {text!r}")
    year, month, day = match.groups()
    return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
