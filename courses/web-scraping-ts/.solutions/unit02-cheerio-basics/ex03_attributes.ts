// ex03_attributes: .attr() は string | undefined を返す
// link_list.html の a タグから href / data-platform を取り出す。text()と違い、
// attr()は属性が無ければundefinedになる(空文字列にはならない)。C#で言えば
// Dictionary.TryGetValue で見つからない場合に近い「見つからないことが型で
// 表現されている」状態。?? でデフォルト値にフォールバックするのが定石。

import * as cheerio from "cheerio";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const _unitDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.basename(path.dirname(_unitDir)) === ".solutions"
  ? path.dirname(path.dirname(_unitDir))
  : path.dirname(_unitDir);
const DATA_DIR = path.join(_courseDir, "data");

export function readFixture(filename: string): string {
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// html文字列を受け取り、class="nav-link" のhref属性値を出現順にすべて配列で返す
// (例: ["/", "/books", "/event", "/blog", "/access"])
export function collectNavHrefs(html: string): string[] {
  const $ = cheerio.load(html);
  const hrefs: string[] = [];
  $(".nav-link").each((_i, el) => {
    hrefs.push($(el).attr("href") ?? "");
  });
  return hrefs;
}

// html文字列を受け取り、class="sns-link" の data-platform 属性値を出現順に
// すべて配列で返す。属性が付いていない要素があれば "unknown" とする
export function collectSnsPlatforms(html: string): string[] {
  const $ = cheerio.load(html);
  const platforms: string[] = [];
  $(".sns-link").each((_i, el) => {
    platforms.push($(el).attr("data-platform") ?? "unknown");
  });
  return platforms;
}

// html文字列とセレクタ、属性名を受け取り、最初にマッチした要素のその属性値を返す
// 要素が無い、または属性が無い場合は null を返す(undefinedではなくnullで統一する)
export function firstAttr(html: string, selector: string, attrName: string): string | null {
  const $ = cheerio.load(html);
  const first = $(selector).first();
  if (first.length === 0) return null;
  return first.attr(attrName) ?? null;
}
