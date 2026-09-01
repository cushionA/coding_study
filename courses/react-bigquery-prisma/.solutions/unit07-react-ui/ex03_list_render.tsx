// ex03_list_render: 配列をmapで一覧描画し、keyの意味を理解する(解答)
import type { ReactElement } from "react";

export type Book = { id: number; title: string; author: string };

export const EMPTY_MESSAGE = "登録された本はありません";

export function getBookKey(book: Book): string {
  return String(book.id);
}

export type BookListProps = { books: Book[] };

export function BookList({ books }: BookListProps): ReactElement {
  if (books.length === 0) {
    return <p>{EMPTY_MESSAGE}</p>;
  }
  return (
    <ul>
      {books.map((book) => (
        <li key={getBookKey(book)}>
          {book.title} — {book.author}
        </li>
      ))}
    </ul>
  );
}
