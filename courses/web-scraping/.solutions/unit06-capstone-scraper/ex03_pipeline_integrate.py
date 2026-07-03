# ex03_pipeline_integrate: 生の抽出結果をクレンジングしてCSVに書き出す
# ex02までで集めた「生テキストのままの辞書」を、数値化・ラベル除去した「整形済み辞書」に変換し、
# 最後にcsv.DictWriterで1本のCSVにする。C#で言えばDTO(生データ)をModel(整形済み)に
# マッピングしてからCsvHelperで書き出す流れに相当する。

import csv


# "産地: エチオピア" のような "ラベル: 値" 形式の文字列から値だけを取り出す
# コロンが無ければ文字列全体をそのまま返す
def strip_label(text):
    if ":" in text:
        _, value = text.split(":", 1)
        return value.strip()
    return text.strip()


# "1200円" のような文字列から数値部分だけを取り出しintで返す
def price_to_int(price_text):
    digits = price_text.replace("円", "").replace(",", "").strip()
    return int(digits)


# ex02のparse_item_detailが返す生の辞書(1件分)を受け取り、以下の形式の
# 整形済み辞書を返す(idはraw_itemに含まれないのでこの関数の引数として別に受け取る)
# {"id": 1, "name": "エチオピア モカ", "price": 1200, "origin": "エチオピア",
#  "roast": "浅煎り", "stock": "在庫あり", "description": "..."}
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


# 整形済み辞書のリストを受け取り、CSVファイルとして書き出す。
# ヘッダはid,name,price,origin,roast,stock,descriptionの順、UTF-8、改行はcsvモジュール標準に従う。
# output_pathはpathlib.Pathまたは文字列。
def write_catalog_csv(rows, output_path):
    fieldnames = ["id", "name", "price", "origin", "roast", "stock", "description"]
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
