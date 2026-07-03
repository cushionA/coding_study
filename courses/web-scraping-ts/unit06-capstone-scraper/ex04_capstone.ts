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

// robots.txtの中身(文字列)を受け取り、userAgentがtargetUrlを取得してよいかを判定する。
// 対応するUser-agentブロック(無ければ"*"ブロック)のDisallow行のいずれかで、
// targetUrlのパス部分が前方一致すれば拒否(false)。
export function isAllowed(robotsTxt: string, userAgent: string, targetUrl: string): boolean {
  // TODO: robotsTxtをUser-agentブロックごとに分割し、userAgent(無ければ"*")に該当する
  // ブロックのDisallow行を集める。targetUrlのパス部分がいずれかのDisallowで始まっていればfalse、
  // そうでなければtrueを返す
  throw new Error("TODO: 未実装");
}

// 一覧ページのHTML文字列を受け取り、そのページの商品詳細URLの配列を返す(ex01と同じ役割)
export function extractItemLinks(listHtml: string): string[] {
  // TODO: class="product-link"のaタグのhrefをBASE_URLと連結して集める
  throw new Error("TODO: 未実装");
}

// 一覧ページのHTML文字列を受け取り、次ページへのURL(なければnull)を返す(ex01と同じ役割)
export function extractNextPageUrl(listHtml: string): string | null {
  // TODO: class="next-page"のaタグを探し、あればURLを、無ければnullを返す
  throw new Error("TODO: 未実装");
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
  // TODO: cheerio.load(detailHtml)でパースし、各class要素の.text()をRawItemDetailに詰める
  throw new Error("TODO: 未実装");
}

// "産地: エチオピア" のような文字列から値だけを取り出す(ex03と同じ役割)
export function stripLabel(text: string): string {
  // TODO: ":" があれば右側だけを取り出し前後の空白を除去する。無ければそのまま返す
  throw new Error("TODO: 未実装");
}

// "1200円" のような文字列から数値部分だけを取り出しnumberで返す(ex03と同じ役割)
export function priceToNumber(priceText: string): number {
  // TODO: "円"や桁区切りのカンマを除去してからnumberに変換する
  throw new Error("TODO: 未実装");
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
  // TODO: rawItemの各フィールドをstripLabel/priceToNumberで整形し、idを加えたオブジェクトにする
  throw new Error("TODO: 未実装");
}

// start_urlから始めて一覧ページを辿り、全ページ分の商品詳細URLを順序通りの配列で返す。
// sleepFnは1ページ取得し終えて次ページへ進む前に呼ぶ、引数なしの関数
// (本物のsetTimeoutベースの待機の代わりに、テストから回数確認用の関数を注入できるようにする)。
export async function collectAllItemLinks(
  startUrl: string,
  sleepFn: () => Promise<void>,
): Promise<string[]> {
  // TODO: fetchLocalでページを取得し、extractItemLinksでURLを集めつつ、
  // 次ページがある間は、注入されたsleepFn()を呼んでから次ページへ進む
  throw new Error("TODO: 未実装");
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
  // TODO: itemUrlsを1件ずつ処理し、fetchLocal→parseItemDetail→cleanItemした結果を集める。
  // 例外時はonErrorがあれば呼んでその件をスキップする。1件処理するごとにsleepFn(crawlDelay)を呼ぶ
  throw new Error("TODO: 未実装");
}

// CleanItemの配列をCSVファイルに書き出す(ex03のwriteCatalogCsvと同じ役割)
export function writeCatalogCsv(rows: CleanItem[], outputPath: string): void {
  // TODO: ヘッダ(id,name,price,origin,roast,stock,description)+rowsの各行をCSV文字列として
  // 組み立て、fs.writeFileSyncでoutputPathに書き出す(値のカンマ・改行・"はエスケープする)
  throw new Error("TODO: 未実装");
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
  // TODO: BASE_URL + "robots.txt" をfetchLocalし、isAllowedで判定 →
  // 許可されていればcollectAllItemLinks→fetchAndCleanAll→writeCatalogCsvの順で実行し、
  // 許可されなければ空配列のままwriteCatalogCsvだけ呼ぶ
  throw new Error("TODO: 未実装");
}
