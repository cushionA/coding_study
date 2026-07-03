// ex03_html_skim: 素朴な文字列処理でHTMLの断片を拾う
// まだcheerioは使わない(それはunit02の仕事)。ここではHTMLも所詮は文字列である
// ことを体感し、素朴な文字列処理がなぜ壊れやすいかを後のユニットと比較するための土台にする。
// C#で言えば、XMLをXDocumentでパースせずstring.IndexOf/Substringで頑張る状態に近い。

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

// HTML文字列から、開始タグ・終了タグに挟まれた最初のテキストを取り出す
// 例: extractBetween(html, "<h1>", "</h1>") -> "本の森書店"
// タグが見つからない場合は null を返す
export function extractBetween(html: string, startTag: string, endTag: string): string | null {
  // TODO: startTagの直後からendTagの直前までを取り出す(見つからなければnull)
  throw new Error("TODO: 未実装");
}

// HTML文字列中の <a href="..."> のURL部分だけを配列で返す(出現順)
// 例: '<a href="/books">...' -> "/books" を集める
// ヒント: 1つずつ 'href="' を探して、次の " まで切り出すのをループで繰り返す
export function extractHrefList(html: string): string[] {
  // TODO: href="..." のURL部分を出現順にすべて集める
  throw new Error("TODO: 未実装");
}

// HTML文字列から <p>...</p> の段落テキストをすべて配列で返す(出現順)
export function extractParagraphs(html: string): string[] {
  // TODO: <p> と </p> のペアを順番に探して中身を配列に集める
  throw new Error("TODO: 未実装");
}
