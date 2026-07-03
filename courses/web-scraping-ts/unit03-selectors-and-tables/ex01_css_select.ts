// ex01_css_select: CSSセレクタで複数レコードを一括抽出する
// unit02では$("h1")のような単純なセレクタだけを扱ったが、実務のHTMLは
// class・子孫関係・属性を組み合わせないと狙った要素だけを拾えないことが多い。
// C#で言えばLINQ to XMLのXPath的な絞り込みに近い感覚。

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

// products.html の商品名(div.item > span.name)をすべて出現順の配列で返す
// ヒント: "親要素 > 子要素" は子孫セレクタではなく「直接の子」だけに絞る子供結合子
export function extractProductNames(html: string): string[] {
  // TODO: cheerio.loadしてから "div.item > span.name" をセレクタで取得し、
  // .each() または .map() でテキストの配列にする
  throw new Error("TODO: 未実装");
}

// products.html の中で data-stock="in"(在庫あり)の商品名だけを配列で返す
// ヒント: 属性セレクタは [属性名="値"] という書き方をCSSセレクタ文字列の中に書ける
export function extractInStockNames(html: string): string[] {
  // TODO: 属性セレクタ [属性名="値"] で在庫ありに絞ってから商品名を集める
  throw new Error("TODO: 未実装");
}

// products.html の class="tag" が付いたリンク(a.tag)のテキストをすべて配列で返す
export function extractTagLabels(html: string): string[] {
  // TODO: "a.tag" セレクタで取得しテキストの配列にする
  throw new Error("TODO: 未実装");
}
