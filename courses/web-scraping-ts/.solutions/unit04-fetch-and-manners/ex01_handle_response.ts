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

import type { FakeResponse } from "../../data/fakeResponses";

// response.ok が true なら response.text() の結果を返し、false なら null を返す
// (C#: response.IsSuccessStatusCode ? await response.Content.ReadAsStringAsync() : null に相当)
export async function getBodyIfOk(response: FakeResponse): Promise<string | null> {
  if (!response.ok) return null;
  return await response.text();
}

// response.headers から Content-Type ヘッダの値を取り出す。存在しなければ "unknown" を返す
// (C#: response.Headers.TryGetValue("Content-Type", out var v) に相当。
//  headers.get(name) は無ければ null を返す)
export function getContentType(response: FakeResponse): string {
  return response.headers.get("Content-Type") ?? "unknown";
}

// 複数のresponseの配列を受け取り、statusごとの件数を数えたRecordを返す
// 例: [200, 200, 404] -> {200: 2, 404: 1}
export function countByStatus(responses: FakeResponse[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const response of responses) {
    counts[response.status] = (counts[response.status] ?? 0) + 1;
  }
  return counts;
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
  if (!response.ok) throw new ResponseError(response.status);
  return await response.text();
}
