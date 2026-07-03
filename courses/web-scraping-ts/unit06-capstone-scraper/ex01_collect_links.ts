// ex01_collect_links: 一覧ページを辿って全商品の詳細リンクを集める
// C#で言えば、ページを1つ取得するたびに「次ページへのリンク」を確認し、
// while ループで辿っていく処理に相当する(件数が事前にわからないのでforeachでは書けない)。

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

// URL(例: BASE_URL + "list_page_1.html")を受け取り、data/site/ 内の対応ファイルを
// UTF-8で読み込んで文字列として返す「ローカルフェッチャ」。
// 本物の fetch(url).then(r => r.text()) の代わりに使う。差し替え可能なようにこの関数越しに全取得を行う。
export async function fetchLocal(url: string): Promise<string> {
  const filename = url.split("/").pop() as string;
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// 一覧ページのHTML文字列を受け取り、そのページに載っている商品の詳細ページURLの
// 配列を返す(cheerioで a.product-link の href を集める)。
// 例: ["https://polaris-coffee.example/item_1.html", ...]
export function extractItemLinks(listHtml: string): string[] {
  // TODO: cheerio.load(listHtml)でパースし、class="product-link"のaタグのhrefを
  // BASE_URLと連結して配列にまとめる
  throw new Error("TODO: 未実装");
}

// 一覧ページのHTML文字列を受け取り、次ページへのURL(なければnull)を返す。
// 例: class="next-page"のaタグがあればそのhrefをBASE_URLと連結して返す
export function extractNextPageUrl(listHtml: string): string | null {
  // TODO: class="next-page"のaタグを探し、あればURLを、無ければnullを返す
  throw new Error("TODO: 未実装");
}

// 開始URL(1ページ目)から始めて、次ページが無くなるまで一覧ページを辿り、
// 全ページ分の商品詳細URLを1つの配列にまとめて返す(順序は登場順)。
// ページ取得にはfetchLocalを、リンク抽出には上の2関数を使う。
export async function collectAllItemLinks(startUrl: string): Promise<string[]> {
  // TODO: startUrlから始めてページを取得し、extractItemLinksで詳細URLを集めつつ、
  // extractNextPageUrlがnullを返すまでループする
  throw new Error("TODO: 未実装");
}
