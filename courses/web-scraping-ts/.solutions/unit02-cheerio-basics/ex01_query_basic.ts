// ex01_query_basic: cheerio.load() と $(セレクタ).text() の基本
// blog_post.html を cheerio で読み込み、クラス名セレクタでテキストを取り出す。
// unit01のindexOf/sliceに比べ、タグの改行や属性順が変わっても壊れないことを体感する。
// C#で言えば、XML文字列をXDocument.Parse()でパースしてXPathで辿る感覚に近い。

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

// HTML文字列を cheerio.load() に渡し、$(クエリ関数)を返す
export function loadHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

// $ とセレクタ文字列を受け取り、そのセレクタにマッチする要素のテキストを返す
// (該当なしでも例外にならず空文字列になる点に注意)
export function getText($: cheerio.CheerioAPI, selector: string): string {
  return $(selector).text();
}

// blog_post.html を読み込み、記事タイトル(class="post-title")のテキストを返す
export function getPostTitle(html: string): string {
  const $ = loadHtml(html);
  return getText($, ".post-title");
}

// blog_post.html を読み込み、投稿メタ情報(class="post-meta")のテキストを返す
export function getPostMeta(html: string): string {
  const $ = loadHtml(html);
  return getText($, ".post-meta");
}
