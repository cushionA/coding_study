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
  let startIdx = html.indexOf(startTag);
  if (startIdx === -1) return null;
  startIdx += startTag.length;
  const endIdx = html.indexOf(endTag, startIdx);
  if (endIdx === -1) return null;
  return html.slice(startIdx, endIdx);
}

// HTML文字列中の <a href="..."> のURL部分だけを配列で返す(出現順)
// 例: '<a href="/books">...' -> "/books" を集める
// ヒント: 1つずつ 'href="' を探して、次の " まで切り出すのをループで繰り返す
export function extractHrefList(html: string): string[] {
  const hrefs: string[] = [];
  const marker = 'href="';
  let searchFrom = 0;
  while (true) {
    let startIdx = html.indexOf(marker, searchFrom);
    if (startIdx === -1) break;
    startIdx += marker.length;
    const endIdx = html.indexOf('"', startIdx);
    if (endIdx === -1) break;
    hrefs.push(html.slice(startIdx, endIdx));
    searchFrom = endIdx + 1;
  }
  return hrefs;
}

// HTML文字列から <p>...</p> の段落テキストをすべて配列で返す(出現順)
export function extractParagraphs(html: string): string[] {
  const paragraphs: string[] = [];
  let searchFrom = 0;
  while (true) {
    let startIdx = html.indexOf("<p>", searchFrom);
    if (startIdx === -1) break;
    startIdx += "<p>".length;
    const endIdx = html.indexOf("</p>", startIdx);
    if (endIdx === -1) break;
    paragraphs.push(html.slice(startIdx, endIdx));
    searchFrom = endIdx + "</p>".length;
  }
  return paragraphs;
}
