// ex04_capstone: useEffectでAPIを取得し、ローディング/エラー/空/成功を出し分ける(解答)
import { useEffect, useState, type ReactElement } from "react";

export type Book = { id: number; title: string; author: string };
export type FetchBooks = () => Promise<Book[]>;

export const LOADING_TEXT = "読み込み中...";
export const EMPTY_TEXT = "本が見つかりませんでした";

export type BookListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; books: Book[] };

export type BookExplorerProps = {
  fetchBooks: FetchBooks;
};

export function BookExplorer({ fetchBooks }: BookExplorerProps): ReactElement {
  const [state, setState] = useState<BookListState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchBooks()
      .then((books) => {
        if (!cancelled) setState({ status: "success", books });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p>{LOADING_TEXT}</p>;
  }
  if (state.status === "error") {
    return <p role="alert">エラー: {state.message}</p>;
  }
  if (state.books.length === 0) {
    return <p>{EMPTY_TEXT}</p>;
  }
  return (
    <ul>
      {state.books.map((book) => (
        <li key={book.id}>{book.title}</li>
      ))}
    </ul>
  );
}
