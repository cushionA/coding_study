// ex03_pipeline_integrate: 生の抽出結果をクレンジングしてCSVに書き出す
// ex02までで集めた「生テキストのままのオブジェクト」を、数値化・ラベル除去した「整形済みオブジェクト」に
// 変換し、最後に自前のCSVライタで1本のCSVにする。C#で言えばDTO(生データ)をModel(整形済み)に
// マッピングしてからStreamWriterで書き出す流れに相当する。

import fs from "node:fs";
import type { RawItemDetail } from "./ex02_fetch_details";

// "産地: エチオピア" のような "ラベル: 値" 形式の文字列から値だけを取り出す
// コロンが無ければ文字列全体をそのまま返す
export function stripLabel(text: string): string {
  // TODO: ":" があれば右側だけを取り出し前後の空白を除去する。無ければそのまま返す
  throw new Error("TODO: 未実装");
}

// "1200円" のような文字列から数値部分だけを取り出しnumberで返す
export function priceToNumber(priceText: string): number {
  // TODO: "円"や桁区切りのカンマを除去してからnumberに変換する
  throw new Error("TODO: 未実装");
}

// クレンジング後の1商品分の整形済みデータ
export type CleanItem = {
  id: number;
  name: string;
  price: number;
  origin: string;
  roast: string;
  stock: string;
  description: string;
};

// ex02のparseItemDetailが返す生のオブジェクト(1件分)を受け取り、CleanItem型の
// 整形済みオブジェクトを返す(idはrawItemに含まれないのでこの関数の引数として別に受け取る)
// {"id": 1, "name": "エチオピア モカ", "price": 1200, "origin": "エチオピア",
//  "roast": "浅煎り", "stock": "在庫あり", "description": "..."}
export function cleanItem(id: number, rawItem: RawItemDetail): CleanItem {
  // TODO: rawItemの各フィールドをstripLabel/priceToNumberで整形し、idを加えたオブジェクトを作る
  throw new Error("TODO: 未実装");
}

// CleanItemの配列を受け取り、CSVファイルとして書き出す。
// ヘッダはid,name,price,origin,roast,stock,descriptionの順、UTF-8。
// 値にカンマ・改行・ダブルクォートが含まれる場合はダブルクォートで囲みエスケープする(RFC4180風)。
export function writeCatalogCsv(rows: CleanItem[], outputPath: string): void {
  // TODO: ヘッダ行+rowsの各行をCSV文字列として組み立て、fs.writeFileSyncでoutputPathに書き出す
  // (カンマ・改行・ダブルクォートを含む値はダブルクォートで囲み、内部の"は""にエスケープする)
  throw new Error("TODO: 未実装");
}
