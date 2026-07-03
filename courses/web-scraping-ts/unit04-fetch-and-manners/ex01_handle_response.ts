// ex01_handle_response: fetchのResponseモデルを理解する
// fetch(url) が返す Response オブジェクトは、C#で言えば HttpClient.GetAsync() が返す
// HttpResponseMessage に相当する。status(StatusCode)・text()(Contentの文字列、Task<string>相当の
// Promise<string>)・headers.get(name)(Headers、TryGetValueに近いが無ければnullを返す)・
// ok(IsSuccessStatusCode)を持つ。
// ここではネットワークを使わず、data/fakeResponses.ts のダミーResponse(この関数群にとっては
// 引数として渡ってくるだけなので、どちらでも同じコードで動く)で練習する。
//
// TypeScriptのfetchは async 関数の中で await response.text() のように使う。
// C#の async Task<string> GetBodyAsync() と同じく、この演習の関数も Promise を返す必要がある。

import type { FakeResponse } from "../data/fakeResponses";

// response.ok が true なら response.text() の結果を返し、false なら null を返す
// (C#: response.IsSuccessStatusCode ? await response.Content.ReadAsStringAsync() : null に相当)
export async function getBodyIfOk(response: FakeResponse): Promise<string | null> {
  // TODO: response.ok を見て text() の結果を返すか null を返すか分岐する(text()はawaitが要る)
  throw new Error("TODO: 未実装");
}

// response.headers から Content-Type ヘッダの値を取り出す。存在しなければ "unknown" を返す
// (C#: response.Headers.TryGetValue("Content-Type", out var v) に相当。
//  headers.get(name) は無ければ null を返す)
export function getContentType(response: FakeResponse): string {
  // TODO: headers.get("Content-Type") の結果を見て、nullなら"unknown"を返す
  throw new Error("TODO: 未実装");
}

// 複数のresponseの配列を受け取り、statusごとの件数を数えたRecordを返す
// 例: [200, 200, 404] -> {200: 2, 404: 1}
export function countByStatus(responses: FakeResponse[]): Record<number, number> {
  // TODO: 各responseのstatusを数えるRecordを作る
  throw new Error("TODO: 未実装");
}

// response が失敗(2xx/3xx以外)を表す例外。C#の HttpRequestException に近い
export class ResponseError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP error: ${status}`);
    this.name = "ResponseError";
  }
}

// response が成功(ok)なら本文を返し、失敗なら ResponseError を送出する
// (C#: response.EnsureSuccessStatusCode() 相当のチェックを自分で書く)
export async function getBodyOrThrow(response: FakeResponse): Promise<string> {
  // TODO: response.okがfalseならResponseErrorを投げる。okならtext()の結果を返す
  throw new Error("TODO: 未実装");
}
