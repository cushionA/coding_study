// ex03_records_cleanup: 欠損セル・class揺れへの防御的アクセス
// 実務のHTMLは必ずしも綺麗ではない。あるはずの要素が無かったり(title欠損)、
// 同じ意味なのにclass名が違ったり(event / event-item)、要素はあっても
// 中身が空文字だったりする。cheerioで存在しない要素を探しても例外にはならず
// 「長さ0のCheerio集合」が返るだけなので、.length === 0 で「無かった」ことを判定し、
// attr()が返すstring | undefinedは ?? でフォールバックするのが定石。
// C#で言えば、LINQのFirstOrDefaultがnullを返すのを?.や??で受け止める感覚に近い。

import * as cheerio from "cheerio";
import type { Element } from "domhandler";
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

// イベント1件分のレコード
export type EventRecord = {
  title: string;
  date: string;
};

// 1つの li 要素(cheerioで選択済みの要素)から EventRecord を作る。
// title または date の .title / .date 要素が無い場合、あるいはテキストが
// 空文字の場合は "不明" を入れる(欠損を落とさず埋める)
// ヒント: $(el).find(".title") の結果が .length === 0 なら要素自体が無い、
//         .text() が "" なら要素はあるが中身が空、どちらも "不明" 扱いでよい
export function toEventRecord($: cheerio.CheerioAPI, el: Element): EventRecord {
  const titleEl = $(el).find(".title");
  const dateEl = $(el).find(".date");
  const title = titleEl.length === 0 || titleEl.text() === "" ? "不明" : titleEl.text();
  const date = dateEl.length === 0 || dateEl.text() === "" ? "不明" : dateEl.text();
  return { title, date };
}

// messy_list.html の中の全イベント(class="event" と class="event-item" の両方)を
// 出現順の EventRecord 配列として返す
// ヒント: セレクタはカンマ区切りで複数指定できる("li.event, li.event-item")
export function parseEvents(html: string): EventRecord[] {
  const $ = cheerio.load(html);
  return $("li.event, li.event-item").map((_, el) => toEventRecord($, el)).get();
}

// EventRecord配列から、date が "不明" ではないものだけを日付の昇順で返す
// (文字列比較で並べ替えてよい。YYYY-MM-DD形式なので文字列順=日付順になる)
export function sortedKnownDates(events: EventRecord[]): EventRecord[] {
  return events
    .filter((e) => e.date !== "不明")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
