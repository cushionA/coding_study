// ex04_capstone: robots.txtを守り、礼儀正しくレスポンスを取得する一連の流れ
// ex01(レスポンスの扱い)・ex02(robots.txt判定)・ex03(レート制限/429対応)を組み合わせ、
// 「クロールしてよいか確認する → 取得する → 429なら待ってリトライする → 本文を返す」という、
// 実務のスクレイパーが最低限守るべき手順をひとつの関数にまとめる。
// C#で言えば複数のサービスをDIで注入して1つのユースケースを組み立てるのと同じ発想。

import type { FakeResponse } from "../data/fakeResponses";
import { parseRobotsTxt, canFetch, type RobotsRules } from "./ex02_robots_parser";
import type { SleepFunc } from "./ex03_rate_limit";

// robots.txtのテキストからRobotsRulesを構築する(ex02と同じ役割)
export function buildRobotsRules(robotsText: string): RobotsRules {
  return parseRobotsTxt(robotsText);
}

// userAgentがpathを取得してよいかどうかを判定する(ex02と同じ役割)
export function isAllowed(rules: RobotsRules, userAgent: string, path: string): boolean {
  return canFetch(rules, userAgent, path);
}

export type FetchOnceFunc = () => Promise<FakeResponse>;

// response が成功ならtext()の結果を返し、429なら1回だけRetry-Afterを待ってfetchFuncで再取得する。
// それ以外の失敗(404など)はnullを返す(呼び出し元でスキップできるように例外は投げない)。
// fetchFunc() は引数無しでresponseを返すPromiseを返す関数(再取得時に呼ぶ)。
export async function getBodyWithRetry(
  response: FakeResponse,
  fetchFunc: FetchOnceFunc,
  sleepFunc: SleepFunc,
  defaultWait = 1.0,
): Promise<string | null> {
  // TODO: response.statusで分岐する。
  // 429ならheaders.get("Retry-After")の秒数(無ければdefaultWait)だけsleepFuncを待ち、
  // fetchFunc()で1回だけ再取得してresponseを更新する。
  // 最終的にresponse.okならtext()の結果を、そうでなければnullを返す。
  throw new Error("TODO: 未実装");
}

// robots.txtで許可されている場合のみ取得を試み、本文(またはnull)を返す。
// 許可されていなければ取得を試みずnullを返す(=クロールしないという判断そのものが結果)。
// rules: buildRobotsRules()で作ったルール, userAgent: 自分のBot名, path: 対象パス,
// fetchFunc: 引数無しでresponseを返すPromiseを返す関数, sleepFunc: ex03と同じ依存性注入
export async function fetchIfAllowed(
  rules: RobotsRules,
  userAgent: string,
  path: string,
  fetchFunc: FetchOnceFunc,
  sleepFunc: SleepFunc,
): Promise<string | null> {
  // TODO: isAllowedで許可を確認してからfetchFunc()を呼び、getBodyWithRetryで本文を得る
  throw new Error("TODO: 未実装");
}
