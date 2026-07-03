# ex03_write_csv: csv.DictWriterでlist[dict]をUTF-8のCSVに書き出す
# C#で言えば CsvHelper の CsvWriter.WriteRecords(list) に相当する。ヘッダ行の自動生成、
# フィールド順の固定、改行コードの扱いを標準ライブラリの csv モジュールに任せる。

import csv


# rows(list[dict])を、指定したfieldnamesの順でCSVファイルに書き出す。
# ヘッダ行を先頭に含める。文字コードはUTF-8、改行の二重化を防ぐため newline="" で開く。
# (C#: new StreamWriter(path, encoding: Encoding.UTF8) + CsvWriter の書き込みに相当)
def write_records_to_csv(rows, fieldnames, path):
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# path のCSVファイルを読み込み、list[dict]として返す(書き出した内容の検証に使う)
def read_records_from_csv(path):
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)
