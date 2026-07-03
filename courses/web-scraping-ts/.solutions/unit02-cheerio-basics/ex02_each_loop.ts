// ex02_each_loop: .each() での反復と .first()/.eq() での1件選択
// link_list.html のナビゲーションリンクを .each() で1件ずつ処理し、配列にまとめる。
// C#で言えば foreach + List<T>.Add のパターン。.each() のコールバック内では
// 素のDOM要素しか渡されないため、$(element) と包み直してからtext/attrを呼ぶ。

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

// html文字列を受け取り、class="nav-link" のテキストを出現順にすべて配列で返す
// (例: ["トップ", "蔵書一覧", "読書会", "ブログ", "アクセス"])
export function collectNavLabels(html: string): string[] {
  const $ = cheerio.load(html);
  const labels: string[] = [];
  $(".nav-link").each((_i, el) => {
    labels.push($(el).text());
  });
  return labels;
}

// html文字列を受け取り、class="nav-link" の最初の1件のテキストを返す
// (要素が1つも無い場合は null を返す)
export function firstNavLabel(html: string): string | null {
  const $ = cheerio.load(html);
  const first = $(".nav-link").first();
  if (first.length === 0) return null;
  return first.text();
}

// html文字列とインデックス(0始まり)を受け取り、class="nav-link" のn番目の
// テキストを返す(範囲外なら null)
export function navLabelAt(html: string, index: number): string | null {
  const $ = cheerio.load(html);
  const target = $(".nav-link").eq(index);
  if (target.length === 0) return null;
  return target.text();
}
