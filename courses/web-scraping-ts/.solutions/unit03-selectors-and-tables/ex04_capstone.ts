// ex04_capstone: ex01〜ex03の総合演習
// products.html から在庫ありの商品だけをオブジェクト配列に整形し、
// 「セレクタで複数レコード抽出→防御的アクセスで整形→集計」という
// このユニットのパイプライン全体を一気通貫で体験する。

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

// 商品1件分のレコード
export type Product = {
  name: string;
  price: number;
  inStock: boolean;
};

// products.html の div.item をすべて Product 配列に変換する(在庫切れも含めすべて)
// ヒント: 価格のテキストは "1800" のような数字文字列なので Number() で数値化する。
//         在庫は data-stock 属性が "in" かどうかで判定する(attr()は string | undefined
//         を返すので、そのまま === "in" と比較すればundefinedのときは自動的にfalseになる)
export function parseProducts(html: string): Product[] {
  const $ = cheerio.load(html);
  return $("div.item").map((_, el) => {
    const name = $(el).find(".name").text();
    const price = Number($(el).find(".price").text());
    const inStock = $(el).attr("data-stock") === "in";
    return { name, price, inStock };
  }).get();
}

// Product配列から在庫ありのものだけを抽出し、価格の安い順に並べて返す
export function inStockSortedByPrice(products: Product[]): Product[] {
  return products.filter((p) => p.inStock).sort((a, b) => a.price - b.price);
}

// Product配列(在庫ありのみを想定)から、価格の合計と平均(整数に四捨五入)を返す
// 商品が0件の場合は { total: 0, average: 0 } を返す(境界値)
export function priceSummary(products: Product[]): { total: number; average: number } {
  if (products.length === 0) return { total: 0, average: 0 };
  const total = products.reduce((sum, p) => sum + p.price, 0);
  const average = Math.round(total / products.length);
  return { total, average };
}
