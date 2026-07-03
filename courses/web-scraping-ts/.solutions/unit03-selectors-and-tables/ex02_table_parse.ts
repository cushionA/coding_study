// ex02_table_parse: HTMLのtableを行×列の2次元データに変換する
// tableはthead(見出し行)とtbody(データ行)、その中のtr(行)・td(セル)という
// 決まった階層構造を持つ。見出しをキー、各行のセルを値にすればArray<Record<string, string>>
// という「行の配列」が作れる。C#で言えばDataTableをList<Dictionary<string,string>>に
// 変換する感覚に近い。

import * as cheerio from "cheerio";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const _unitDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.basename(path.dirname(_unitDir)) === ".solutions"
  ? path.dirname(path.dirname(_unitDir))
  : path.dirname(_unitDir);
const DATA_DIR = path.join(_courseDir, "data");

// data/ 以下のファイルをUTF-8で読み込んで文字列として返す
export function readFixture(filename: string): string {
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// table_stats.html の thead th のテキストを出現順の配列で返す
// 例: ["月", "来店者数", "売上冊数"]
export function extractHeaders(html: string): string[] {
  const $ = cheerio.load(html);
  return $("table thead th").map((_, el) => $(el).text().trim()).get();
}

// table_stats.html の tbody tr をそれぞれ td のテキストの配列に変換し、
// 行の配列(2次元配列)として返す
// 例: [["4月", "320", "145"], ["5月", "410", "198"], ...]
export function extractRows(html: string): string[][] {
  const $ = cheerio.load(html);
  return $("table tbody tr").toArray().map((tr) => {
    return $(tr).find("td").map((_i, td) => $(td).text().trim()).get();
  });
}

// ヘッダー配列と行(文字列配列)の配列を受け取り、Array<Record<string, string>>に変換する
// 例: headers=["月","来店者数"], rows=[["4月","320"]]
//     -> [{ 月: "4月", 来店者数: "320" }]
// ヒント: C#のLINQで zip(headers, row) してDictionaryを作る発想に近い。
// 行の列数がheadersより少ない場合、足りない列は無視してよい(ズレの対処はex03の範囲)
export function zipToRecords(headers: string[], rows: string[][]): Array<Record<string, string>> {
  return rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (i < row.length) {
        record[header] = row[i];
      }
    });
    return record;
  });
}

// table_stats.html を丸ごと Array<Record<string, string>> に変換する統合関数
// (extractHeaders・extractRows・zipToRecordsを組み合わせるだけでよい)
export function parseStatsTable(html: string): Array<Record<string, string>> {
  const headers = extractHeaders(html);
  const rows = extractRows(html);
  return zipToRecords(headers, rows);
}
