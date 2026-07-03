// ex03_rate_limit: リクエスト間隔を守り、429に対応する
// サーバーに休みなくリクエストを送るのは迷惑行為であり、多くのサイトはCrawl-delayやレート制限で
// それをやんわり(あるいは強制的に)止めようとする。429 Too Many Requests は「送りすぎだから
// しばらく待って」というサーバーからの明示的な合図で、多くの場合 Retry-After ヘッダで待つべき
// 秒数まで教えてくれる。C#で言えば HttpClient に自前でリトライ/バックオフを実装するのと同じ話。
//
// この演習では実際に setTimeout で待たない。テストで数秒待たされると学習体験が悪いのと、
// 「何秒待とうとしたか」を検証したいだけなので、待つ処理を行う関数を引数として受け取り
// (依存性注入。C#のDIコンテナに登録するデリゲートに近い)、テスト側では記録するだけの
// ダミー関数(Promiseをすぐresolveする)を渡して検証する。
//
// sleepFunc の型は (seconds: number) => Promise<void>。本番では
//   const realSleep = (s: number) => new Promise<void>((resolve) => setTimeout(resolve, s * 1000));
// のような実装を渡す想定。

import type { FakeResponse } from "../data/fakeResponses";

export type SleepFunc = (seconds: number) => Promise<void>;
export type ClockFunc = () => number;
export type FetchFunc = (url: string) => Promise<string>;

// 前回リクエストからの経過時間(秒)が minInterval 未満なら、不足分だけ sleepFunc を呼ぶ(await必須)。
// now/lastCalledAt は performance.now()/1000 のような単調増加する秒数を想定する。
// 実際に待った秒数(待たなかった場合は0)を返す。
export async function waitIfNeeded(
  now: number,
  lastCalledAt: number,
  minInterval: number,
  sleepFunc: SleepFunc,
): Promise<number> {
  // TODO: 経過時間を計算し、minIntervalに満たなければ不足分をawait sleepFuncで待つ
  throw new Error("TODO: 未実装");
}

// response が429なら、Retry-Afterヘッダの秒数だけ sleepFunc を呼んでからtrueを返す(リトライすべき)。
// 429でなければ何もせずfalseを返す(リトライ不要)。
// Retry-Afterが無い場合は defaultWait 秒を使う。
export async function handleRateLimit(
  response: FakeResponse,
  sleepFunc: SleepFunc,
  defaultWait = 1.0,
): Promise<boolean> {
  // TODO: response.statusが429かどうかで分岐し、429ならheaders.get("Retry-After")を読んで
  // (無ければdefaultWait、あれば文字列なので数値化して)sleepFuncをawaitで呼ぶ
  throw new Error("TODO: 未実装");
}

// 複数のURLに対して、1件処理するたびにminInterval秒の間隔を空けながらfetchFuncを呼び出す。
// fetchFunc(url) は本文文字列を返すPromiseを返す関数。sleepFuncは前述と同じ依存性注入。
// clockFunc は現在時刻(秒)を返す引数無しの関数。
// 各URLの結果を順番通りの配列で返す。1件目の前には待たない。
export async function fetchAllWithDelay(
  urls: string[],
  fetchFunc: FetchFunc,
  minInterval: number,
  sleepFunc: SleepFunc,
  clockFunc: ClockFunc,
): Promise<string[]> {
  // TODO: 2件目以降は前回呼び出し時刻からminInterval秒あけてfetchFuncを呼ぶ(waitIfNeededが使える)
  throw new Error("TODO: 未実装");
}
