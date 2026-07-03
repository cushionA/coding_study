// ex03_write_csv: CSVライタを標準機能だけで自作する
// C#では CsvHelper の CsvWriter.WriteRecords(...) 一発で済むが、ここでは
// そのライブラリが内部でやっていること(値のエスケープ・行の組み立て・ファイル書き出し)を
// fs.writeFileSync だけで再現する。CSVの仕様(RFC4180)のポイントは:
//   - フィールドにカンマ・改行・ダブルクォートのいずれかが含まれる場合、
//     フィールド全体をダブルクォートで囲む
//   - フィールド内のダブルクォートは "" (2個)にエスケープする
//   - 上記に該当しないフィールドはそのまま(クォート不要)

import fs from "node:fs";

// 1件のクレンジング済みレコード(ex02のCleanRecordと同じ形)
export type CsvRecord = {
  name: string;
  price: number;
  stock: number;
  date: string;
};

// 1つのフィールド値(文字列化済み)を、必要ならCSV用にダブルクォートでエスケープする
// - カンマ・改行(\nまたは\r)・ダブルクォートのいずれかを含む場合だけクォートする
// - クォートする場合、フィールド内の " は "" に置き換える
// 例: "文芸" -> "文芸" (そのまま) / 'a,b' -> '"a,b"' / '5"cm' -> '"5""cm"'
export function escapeCsvField(value: string): string {
  // TODO: カンマ/改行/ダブルクォートを含む場合だけ、"" エスケープしてダブルクォートで囲む
  throw new Error("TODO: 未実装");
}

// CsvRecordの配列を、ヘッダ行付きのCSV文字列(1行目: name,price,stock,date)に変換する
// - 各行はカンマ区切り、行末は "\n"(最終行にも改行を付ける)
// - price/stockは数値なので文字列化してからescapeCsvFieldに通す(数値自体はエスケープ不要だが、
//   統一的にescapeCsvFieldを通しておくと将来フィールドが増えても安全)
// 例: [{name:"文芸書",price:1200,stock:5,date:"2026-01-01"}]
//     -> "name,price,stock,date\n文芸書,1200,5,2026-01-01\n"
export function recordsToCsv(records: CsvRecord[]): string {
  // TODO: ヘッダ行 + 各レコードをカンマ区切りにした行を組み立て、"\n"区切りで連結する
  throw new Error("TODO: 未実装");
}

// recordsToCsvで作ったCSV文字列を、指定パスにUTF-8で書き出す
// (C#の File.WriteAllText(path, csv, Encoding.UTF8) に相当。fs.writeFileSyncは
// 第3引数に "utf-8" を渡すとUTF-8で書き込める)
export function writeCsvFile(records: CsvRecord[], filePath: string): void {
  // TODO: recordsToCsvでCSV文字列を作り、fs.writeFileSyncでfilePathにUTF-8で書き出す
  throw new Error("TODO: 未実装");
}
