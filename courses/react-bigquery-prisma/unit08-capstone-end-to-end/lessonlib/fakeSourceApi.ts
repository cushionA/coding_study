/* =====================================================================
 * lesson / 演習用の「偽の外部書籍API」— unit02 で書いたクライアントの相手役
 * ---------------------------------------------------------------------
 * 本物の fetch と同じ形(引数 url / 戻り値 Response)の関数を返します。
 * ネットワークには一切出ません。
 *
 * 返す JSON は、いかにも外部APIらしい **snake_case の DTO** です:
 *     { "items": [ { "isbn": "...", "title": "...", "author_name": "...",
 *                    "first_publish_year": 1905 } ] }
 * アプリ内部のドメイン型(camelCase)とは形が違う、という unit02 概念3
 * (DTO → ドメインへの変換)の状況を再現するためです。
 * ===================================================================== */

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

/** 外部APIが返す1件(DTO)。camelCase ではないことに注目。 */
export type SourceBookDto = {
  isbn: string;
  title: string;
  author_name: string;
  first_publish_year: number | null;
};

export const SOURCE_BOOKS: SourceBookDto[] = [
  { isbn: "978-4-00-1", title: "吾輩は猫である", author_name: "夏目漱石", first_publish_year: 1905 },
  { isbn: "978-4-00-2", title: "坊っちゃん", author_name: "夏目漱石", first_publish_year: 1906 },
  { isbn: "978-4-00-3", title: "こころ", author_name: "夏目漱石", first_publish_year: 1914 },
  { isbn: "978-4-10-1", title: "走れメロス", author_name: "太宰治", first_publish_year: 1940 },
  { isbn: "978-4-10-2", title: "人間失格", author_name: "太宰治", first_publish_year: 1948 },
  { isbn: "978-4-12-1", title: "羅生門", author_name: "芥川龍之介", first_publish_year: 1915 },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 偽の外部API。
 *   status: 200 以外を指定すると、その HTTP ステータスを返す(fetch は例外を投げない)
 *   throwNetworkError: true で「通信自体が失敗」を再現(fetch が例外を投げる)
 *   items: 返すデータを差し替えたいとき
 */
export function createFakeSourceApi(opts: {
  status?: number;
  throwNetworkError?: boolean;
  delayMs?: number;
  items?: SourceBookDto[];
} = {}): { fetch: FetchLike; calls: string[] } {
  const calls: string[] = [];
  const fetchLike: FetchLike = async (url) => {
    calls.push(url);
    await sleep(opts.delayMs ?? 0);
    if (opts.throwNetworkError === true) throw new TypeError("fetch failed");
    const status = opts.status ?? 200;
    if (status !== 200) {
      return new Response(`{"error":"upstream"}`, { status });
    }
    return new Response(JSON.stringify({ items: opts.items ?? SOURCE_BOOKS }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetch: fetchLike, calls };
}
