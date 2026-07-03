# ex03_pipeline_integrate: 生の抽出結果をクレンジングしてCSVに書き出す
# ex02までで集めた「生テキストのままの辞書」を、数値化・ラベル除去した「整形済み辞書」に変換し、
# 最後にcsv.DictWriterで1本のCSVにする。C#で言えばDTO(生データ)をModel(整形済み)に
# マッピングしてからCsvHelperで書き出す流れに相当する。

import csv


# "産地: エチオピア" のような "ラベル: 値" 形式の文字列から値だけを取り出す
# コロンが無ければ文字列全体をそのまま返す
def strip_label(text):
    # TODO: ":" があれば右側だけを取り出し前後の空白を除去する。無ければそのまま返す
    raise NotImplementedError


# "1200円" のような文字列から数値部分だけを取り出しintで返す
def price_to_int(price_text):
    # TODO: "円"や桁区切りのカンマを除去してからintに変換する
    raise NotImplementedError


# ex02のparse_item_detailが返す生の辞書(1件分)を受け取り、以下の形式の
# 整形済み辞書を返す(idはraw_itemに含まれないのでこの関数の引数として別に受け取る)
# {"id": 1, "name": "エチオピア モカ", "price": 1200, "origin": "エチオピア",
#  "roast": "浅煎り", "stock": "在庫あり", "description": "..."}
def clean_item(item_id, raw_item):
    # TODO: raw_itemの各フィールドをstrip_label/price_to_intで整形し、idを加えた辞書を作る
    raise NotImplementedError


# 整形済み辞書のリストを受け取り、CSVファイルとして書き出す。
# ヘッダはid,name,price,origin,roast,stock,descriptionの順、UTF-8、改行はcsvモジュール標準に従う。
# output_pathはpathlib.Pathまたは文字列。
def write_catalog_csv(rows, output_path):
    # TODO: csv.DictWriterでヘッダを書き、rowsを1行ずつ書き出す(newline=""を忘れない)
    raise NotImplementedError
