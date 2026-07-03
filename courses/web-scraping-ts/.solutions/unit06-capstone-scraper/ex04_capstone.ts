// ex04_capstone: ex01〜ex03を統合した一気通貫のスクレイパー
// 「robots.txtを確認する→一覧ページをページネーションで辿ってリンクを集める→
//  詳細ページを1件ずつ礼儀正しく(sleepを挟んで)取得する→整形する→CSVに書き出す」
// という実務のスクレイパーそのものの流れを、関数分割して1本にまとめる。
// C#で言えば、複数のサービスクラス(RobotsChecker/LinkCollector/DetailFetcher/CsvWriter)を
// 1つのオーケストレーターメソッドから順番に呼び出すのと同じ構造。

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
export const USER_AGENT = "PolarisScraperBot";

// URLを受け取り、data/site/ 内の対応ファイルをUTF-8で読み込んで文字列として返す「ローカルフェッチャ」。
// 対応するファイルが無い場合はNode標準のfs例外がそのまま投げられる(呼び出し側で捕まえる)。
export async function fetchLocal(url: string): Promise<string> {
  const filename = url.split("/").pop() as string;
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

type RobotsRule = { userAgent: string; disallows: string[] };

function parseRobotsTxt(robotsTxt: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let current: RobotsRule | null = null;
  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key.trim().toLowerCase() === "user-agent") {
      current = { userAgent: value, disallows: [] };
      rules.push(current);
    } else if (key.trim().toLowerCase() === "disallow" && current) {
      current.disallows.push(value);
    }
  }
  return rules;
}

// robots.txtの中身(文字列)を受け取り、userAgentがtargetUrlを取得してよいかを判定する。
// 対応するUser-agentブロック(無ければ"*"ブロック)のDisallow行のいずれかで、
// targetUrlのパス部分が前方一致すれば拒否(false)。
export function isAllowed(robotsTxt: string, userAgent: string, targetUrl: string): boolean {
  const rules = parseRobotsTxt(robotsTxt);
  const matched = rules.find((r) => r.userAgent === userAgent) ?? rules.find((r) => r.userAgent === "*");
  if (!matched) return true;

  const urlPath = new URL(targetUrl).pathname;
  return !matched.disallows.some((disallow) => disallow !== "" && urlPath.startsWith(disallow));
}

// 一覧ページのHTML文字列を受け取り、そのページの商品詳細URLの配列を返す(ex01と同じ役割)
export function extractItemLinks(listHtml: string): string[] {
  const $ = cheerio.load(listHtml);
  const links: string[] = [];
  $("a.product-link").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(BASE_URL + href);
  });
  return links;
}

// 一覧ページのHTML文字列を受け取り、次ページへのURL(なければnull)を返す(ex01と同じ役割)
export function extractNextPageUrl(listHtml: string): string | null {
  const $ = cheerio.load(listHtml);
  const href = $("a.next-page").attr("href");
  return href ? BASE_URL + href : null;
}

export type RawItemDetail = {
  name: string;
  price: string;
  origin: string;
  roast: string;
  stock: string;
  description: string;
};

// 詳細ページのHTML文字列を受け取り、生テキストのままのオブジェクトを返す(ex02と同じ役割)
// キーはname/price/origin/roast/stock/description
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

// "産地: エチオピア" のような文字列から値だけを取り出す(ex03と同じ役割)
export function stripLabel(text: string): string {
  const idx = text.indexOf(":");
  if (idx === -1) return text;
  return text.slice(idx + 1).trim();
}

// "1200円" のような文字列から数値部分だけを取り出しnumberで返す(ex03と同じ役割)
export function priceToNumber(priceText: string): number {
  const digitsOnly = priceText.replace(/[^0-9]/g, "");
  return Number(digitsOnly);
}

export type CleanItem = {
  id: number;
  name: string;
  price: number;
  origin: string;
  roast: string;
  stock: string;
  description: string;
};

// 生の詳細オブジェクトとidを受け取り、整形済みオブジェクトを返す(ex03のcleanItemと同じ役割)
export function cleanItem(id: number, rawItem: RawItemDetail): CleanItem {
  return {
    id,
    name: rawItem.name,
    price: priceToNumber(rawItem.price),
    origin: stripLabel(rawItem.origin),
    roast: stripLabel(rawItem.roast),
    stock: rawItem.stock,
    description: rawItem.description,
  };
}

// start_urlから始めて一覧ページを辿り、全ページ分の商品詳細URLを順序通りの配列で返す。
// sleepFnは1ページ取得し終えて次ページへ進む前に呼ぶ、引数なしの関数
// (本物のsetTimeoutベースの待機の代わりに、テストから回数確認用の関数を注入できるようにする)。
export async function collectAllItemLinks(
  startUrl: string,
  sleepFn: () => Promise<void>,
): Promise<string[]> {
  const allLinks: string[] = [];
  let currentUrl: string | null = startUrl;
  while (currentUrl !== null) {
    const html = await fetchLocal(currentUrl);
    allLinks.push(...extractItemLinks(html));
    const nextUrl = extractNextPageUrl(html);
    if (nextUrl !== null) {
      await sleepFn();
    }
    currentUrl = nextUrl;
  }
  return allLinks;
}

// 詳細URLの配列を1から始まるIDと対応付けながら取得・整形し、整形済みオブジェクトの配列を返す。
// 1件取得するごとに、注入されたsleepFnへcrawlDelay(秒)を渡して待つ。取得や整形で例外が起きた
// 場合はその1件をスキップし、onErrorが渡されていればonError(url, 例外)を呼んで処理を続ける。
export async function fetchAndCleanAll(
  itemUrls: string[],
  sleepFn: (delaySeconds: number) => Promise<void>,
  crawlDelay: number,
  onError?: (url: string, error: unknown) => void,
): Promise<CleanItem[]> {
  const results: CleanItem[] = [];
  for (let i = 0; i < itemUrls.length; i++) {
    const url = itemUrls[i];
    try {
      const html = await fetchLocal(url);
      const raw = parseItemDetail(html);
      results.push(cleanItem(i + 1, raw));
    } catch (error) {
      if (onError) onError(url, error);
    }
    await sleepFn(crawlDelay);
  }
  return results;
}

const CSV_HEADERS = ["id", "name", "price", "origin", "roast", "stock", "description"] as const;

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// CleanItemの配列をCSVファイルに書き出す(ex03のwriteCatalogCsvと同じ役割)
export function writeCatalogCsv(rows: CleanItem[], outputPath: string): void {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(CSV_HEADERS.map((key) => escapeCsvField(row[key])).join(","));
  }
  fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf-8");
}

// 全体を統括する関数。robots.txtを確認し、許可されていれば一覧を巡回して詳細を集め、
// 整形してoutputPathにCSVを書き出す。許可されていなければ何も取得せず空配列のまま
// CSVを書き出す(ヘッダのみ)。戻り値は書き出した整形済みオブジェクトの配列。
export async function runPipeline(
  startUrl: string,
  outputPath: string,
  sleepFn: (delaySeconds?: number) => Promise<void>,
  crawlDelay = 1,
): Promise<CleanItem[]> {
  const robotsTxt = await fetchLocal(BASE_URL + "robots.txt");
  const allowed = isAllowed(robotsTxt, USER_AGENT, startUrl);

  let rows: CleanItem[] = [];
  if (allowed) {
    const itemUrls = await collectAllItemLinks(startUrl, () => sleepFn());
    rows = await fetchAndCleanAll(itemUrls, (delay) => sleepFn(delay), crawlDelay);
  }
  writeCatalogCsv(rows, outputPath);
  return rows;
}
