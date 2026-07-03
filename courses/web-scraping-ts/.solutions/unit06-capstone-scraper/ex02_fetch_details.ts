// ex02_fetch_details: 詳細ページを取得して1商品分のフィールドを取り出す
// ex01で集めたURLの配列を1件ずつ「取得→解析」するステップ。
// C#で言えば、IDのリストを受け取ってDB/APIから1件ずつレコードを取得するループに近い。

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import * as cheerio from "cheerio";

const _unitDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.basename(path.dirname(_unitDir)) === ".solutions"
  ? path.dirname(path.dirname(_unitDir))
  : path.dirname(_unitDir);
const DATA_DIR = path.join(_courseDir, "data", "site");

export const BASE_URL = "https://polaris-coffee.example/";

// URLを受け取り、data/site/ 内の対応ファイルをUTF-8で読み込んで文字列として返す(ex01と同じ役割)
export async function fetchLocal(url: string): Promise<string> {
  const filename = url.split("/").pop() as string;
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// 詳細ページで抽出する生データ(加工前・テキストのまま)
export type RawItemDetail = {
  name: string;
  price: string;
  origin: string;
  roast: string;
  stock: string;
  description: string;
};

// 詳細ページのHTML文字列を受け取り、RawItemDetail型のオブジェクトを返す(値は加工せず生のテキストのまま)
// 例: {"name": "エチオピア モカ", "price": "1200円", "origin": "産地: エチオピア",
//      "roast": "焙煎度: 浅煎り", "stock": "在庫あり", "description": "..."}
// class名はitem-name/item-price/item-origin/item-roast/item-stock/item-description
export function parseItemDetail(detailHtml: string): RawItemDetail {
  const $ = cheerio.load(detailHtml);
  return {
    name: $(".item-name").text(),
    price: $(".item-price").text(),
    origin: $(".item-origin").text(),
    roast: $(".item-roast").text(),
    stock: $(".item-stock").text(),
    description: $(".item-description").text(),
  };
}

// 詳細URLの配列を受け取り、1件ずつfetchLocal→parseItemDetailした結果を配列で返す。
// 順序はitemUrlsと同じ順を保つ。
export async function fetchAllItemDetails(itemUrls: string[]): Promise<RawItemDetail[]> {
  const details: RawItemDetail[] = [];
  for (const url of itemUrls) {
    const html = await fetchLocal(url);
    details.push(parseItemDetail(html));
  }
  return details;
}
