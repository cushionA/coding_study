// ex04_capstone: ex01〜ex03の総合演習
// dirty_records.html(在庫一覧)をcheerioで読み込み、汚れたテキストを
// クレンジング(ex01)→検証してスキップ(ex02)→CSV文字列化(ex03)する、
// このユニット全体の「取得→解析→整形→出力」パイプラインを1本にまとめる。

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import * as cheerio from "cheerio";

import { cleanText, parsePriceYen, parseStock, normalizeDate } from "./ex01_clean_fields";
import { cleanAllRecords, type RawRecord, type FieldParsers } from "./ex02_error_handling";
import { recordsToCsv } from "./ex03_write_csv";

const _unitDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.basename(path.dirname(_unitDir)) === ".solutions"
  ? path.dirname(path.dirname(_unitDir))
  : path.dirname(_unitDir);
const DATA_DIR = path.join(_courseDir, "data");

// data/ 以下のファイルをUTF-8で読み込んで文字列として返す
export function readFixture(filename: string): string {
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// dirty_records.html の文字列をcheerioで読み込み、tr.record 1行ごとに
// name/price/stock/date のテキストをそのまま(未クレンジング)取り出してRawRecordの配列にする
// ヒント: cheerio.load(html) で $ を得たら、$("tr.record").each((_, el) => {...}) で1行ずつ処理する。
// 各行の中では $(el).find(".name").text() のように .find() + .text() でセル文字列を取れる
export function extractRawRecords(html: string): RawRecord[] {
  const $ = cheerio.load(html);
  const records: RawRecord[] = [];
  $("tr.record").each((_, el) => {
    const row = $(el);
    records.push({
      name: row.find(".name").text(),
      price: row.find(".price").text(),
      stock: row.find(".stock").text(),
      date: row.find(".date").text(),
    });
  });
  return records;
}

// ex01のクレンジング関数をFieldParsers形式にまとめたもの
// (parseNameはcleanTextをそのまま使う)
const parsers: FieldParsers = {
  parseName: cleanText,
  parsePrice: parsePriceYen,
  parseStock: parseStock,
  parseDate: normalizeDate,
};

// dirty_records.html の文字列を受け取り、
// 抽出→クレンジング→不正行スキップ→CSV文字列化まで一気通貫で行う
// 戻り値はrecordsToCsvが返すCSV文字列そのもの(ヘッダ行付き)
export function buildCsvFromDirtyHtml(html: string): string {
  const raws = extractRawRecords(html);
  const cleaned = cleanAllRecords(raws, parsers);
  return recordsToCsv(cleaned);
}
