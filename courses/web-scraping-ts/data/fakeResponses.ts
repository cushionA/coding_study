// fakeResponses: fetch() が返す Response(Web標準)を模したダミー応答を作るヘルパ。
// C#で言えば HttpClient.GetAsync() が返す HttpResponseMessage を単体テスト用にスタブ化するのと
// 同じ発想。本物のfetchは一切呼ばない・ネットワークにも触れない、純粋なデータ生成コード。
//
// 本物の Response は headers.get(name) が string | null を返し、text() は Promise<string> を返す。
// FakeResponse も同じインターフェースを持たせているので、演習コードは本物の Response を受け取っても
// この FakeResponse を受け取っても同じ書き方でアクセスできる。

export class FakeHeaders {
  private readonly map: Map<string, string>;

  constructor(entries: Record<string, string> = {}) {
    this.map = new Map(Object.entries(entries));
  }

  // 本物の Headers.get() と同じく、無ければ null を返す(undefinedではない)
  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) ?? this.map.get(name) ?? null;
  }
}

export class FakeResponse {
  readonly status: number;
  readonly headers: FakeHeaders;
  private readonly body: string;

  constructor(status: number, body = "", headers: Record<string, string> = {}) {
    this.status = status;
    this.body = body;
    this.headers = new FakeHeaders(headers);
  }

  // 本物の Response.ok と同じ判定(2xx〜3xx未満)
  get ok(): boolean {
    return this.status >= 200 && this.status < 400;
  }

  // 本物の Response.text() と同じく非同期でボディ文字列を返す
  async text(): Promise<string> {
    return this.body;
  }
}

export function makeOkResponse(body: string): FakeResponse {
  return new FakeResponse(200, body, { "Content-Type": "text/html; charset=utf-8" });
}

export function makeNotFoundResponse(): FakeResponse {
  return new FakeResponse(404, "Not Found", { "Content-Type": "text/plain" });
}

export function makeRateLimitedResponse(retryAfterSeconds = 5): FakeResponse {
  return new FakeResponse(429, "Too Many Requests", {
    "Content-Type": "text/plain",
    "Retry-After": String(retryAfterSeconds),
  });
}
