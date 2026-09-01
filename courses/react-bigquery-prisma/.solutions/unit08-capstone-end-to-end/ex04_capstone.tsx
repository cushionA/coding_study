// ex04_capstone: 検索入力(ex01) と 検索エンドポイント(ex03) を1画面に結線する(解答)
import { useState, type ReactElement } from "react";
import { SearchBox, DEFAULT_DEBOUNCE_MS } from "./ex01_search_input";
import type { SearchResponse } from "./ex03_search_endpoint";

export type SearchBooks = (keyword: string) => Promise<SearchResponse>;

export type SearchPageProps = {
  searchBooks: SearchBooks;
  debounceMs?: number;
};

export const IDLE_TEXT = "検索語を入力してください";
export const LOADING_TEXT = "検索中...";
export const NO_RESULTS_TEXT = "本が見つかりませんでした";
export const SUMMARY_UNAVAILABLE_TEXT = "著者別集計は利用できません";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; response: SearchResponse };

export function SearchPage({ searchBooks, debounceMs = DEFAULT_DEBOUNCE_MS }: SearchPageProps): ReactElement {
  const [state, setState] = useState<PageState>({ status: "idle" });

  function handleSearch(keyword: string): void {
    if (keyword === "") {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    searchBooks(keyword)
      .then((response) => setState({ status: "success", response }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setState({ status: "error", message });
      });
  }

  return (
    <div>
      <SearchBox onSearch={handleSearch} debounceMs={debounceMs} />
      {state.status === "idle" && <p>{IDLE_TEXT}</p>}
      {state.status === "loading" && <p>{LOADING_TEXT}</p>}
      {state.status === "error" && <p role="alert">エラー: {state.message}</p>}
      {state.status === "success" && (
        <>
          {state.response.items.length === 0 ? (
            <p>{NO_RESULTS_TEXT}</p>
          ) : (
            <ul>
              {state.response.items.map((book) => (
                <li key={book.id}>{book.title}</li>
              ))}
            </ul>
          )}
          {state.response.summary === null ? (
            <p>{SUMMARY_UNAVAILABLE_TEXT}</p>
          ) : (
            <ul>
              {state.response.summary.map((s) => (
                <li key={s.author}>
                  {s.author}: {s.count}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
