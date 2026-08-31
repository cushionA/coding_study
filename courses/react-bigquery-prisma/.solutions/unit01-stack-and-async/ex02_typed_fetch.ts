// ex02_typed_fetch: fetchの戻り値Responseを扱い、jsonの結果を型に落とし込む
// Node標準の fetch は C#の HttpClient.GetAsync に近い。戻り値の Response は
// C#の HttpResponseMessage に相当し、.ok / .status で成否を判定してから
// 中身を取り出す(取り出す前に判定するのがマナー、というのもC#と同じ)。
// このユニットでは外部通信を一切しないため、fetch そのものを直接呼ばず、
// 「fetch互換の関数」を引数で受け取る(依存性注入)設計にする。
// こうすることでテストは本物の fetch の代わりにダミーの Response を渡せる。

// fetch 関数の型。Node/ブラウザの標準 fetch と同じ形(第2引数は省略可)。
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// 外部APIが返す書籍1件分のJSON形。
export type BookApiResponse = {
  id: number;
  title: string;
  author: string;
};

// Response の ok プロパティで成功/失敗を判定する。
// (ok は status が 200〜299 のときだけ true になる)
export function isSuccessResponse(response: Response): boolean {
  return response.ok;
}

// HTTPステータスコードを大まかな4分類に振り分ける。
export function getStatusCategory(
  status: number,
): "success" | "client-error" | "server-error" | "unknown" {
  if (status >= 200 && status <= 299) return "success";
  if (status >= 400 && status <= 499) return "client-error";
  if (status >= 500 && status <= 599) return "server-error";
  return "unknown";
}

// fetchFn で url を取得し、成功していれば json() をパースして T として返す。
// 失敗(ok が false)の場合は、ステータスコードを含む Error を throw する。
// C#で言えば response.EnsureSuccessStatusCode() を自前で書くイメージ。
export async function fetchJson<T>(fetchFn: FetchLike, url: string): Promise<T> {
  const response = await fetchFn(url);
  if (!isSuccessResponse(response)) {
    throw new Error(`${url} の取得に失敗しました (status: ${response.status})`);
  }
  return (await response.json()) as T;
}

// id を指定して1冊分の書籍情報を取得する(fetchJson を利用する)。
export async function fetchBook(fetchFn: FetchLike, id: number): Promise<BookApiResponse> {
  return fetchJson<BookApiResponse>(fetchFn, `/api/books/${id}`);
}
