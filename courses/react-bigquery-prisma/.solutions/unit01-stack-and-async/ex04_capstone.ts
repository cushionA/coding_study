// ex04_capstone: ex01(Promise)・ex02(型付きfetch)・ex03(環境変数)の統合
// 実務のありがちな1コマを再現する: 「.envから設定を読み込み、複数の書籍を
// 並行取得し、結果を返す」という非同期関数を1つにまとめる。
// 秘密情報(apiKey)は関数の内部で使うだけで、戻り値には絶対に含めないこと
// — これは「サービスアカウント鍵をフロントに渡さない」原則の縮図でもある。

import { runInParallel } from "./ex01_promise_basics";
import { fetchBook, type FetchLike, type BookApiResponse } from "./ex02_typed_fetch";
import { loadApiConfig } from "./ex03_env_config";

// フロントエンドに返しても安全な設定情報だけを持つ型。
// apiKeyそのものは含めず、「設定されているかどうか」だけを持つ。
export type BookApiConfigSummary = {
  baseUrl: string;
  apiKeyPresent: boolean;
};

export type LoadedBookCatalog = {
  config: BookApiConfigSummary;
  books: BookApiResponse[];
};

// 複数の書籍IDを並行取得する(ex01のrunInParallelとex02のfetchBookの組み合わせ)。
export async function fetchBooksConcurrently(
  fetchFn: FetchLike,
  ids: number[],
): Promise<BookApiResponse[]> {
  const tasks = ids.map((id) => () => fetchBook(fetchFn, id));
  return runInParallel(tasks);
}

// 環境変数から設定を読み込み、指定した書籍IDを並行取得して1つにまとめる。
// 戻り値の config には apiKey そのものを絶対に入れないこと。
export async function loadBookCatalog(
  fetchFn: FetchLike,
  bookIds: number[],
): Promise<LoadedBookCatalog> {
  const { baseUrl, apiKey } = loadApiConfig();
  const books = await fetchBooksConcurrently(fetchFn, bookIds);
  return {
    config: {
      baseUrl,
      apiKeyPresent: apiKey.length > 0,
    },
    books,
  };
}
