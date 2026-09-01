// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit07-react-ui/ex04_capstone")
  : await import("../ex04_capstone");

type Book = { id: number; title: string; author: string };

const sampleBooks: Book[] = [
  { id: 1, title: "実践TypeScript入門", author: "佐藤" },
  { id: 2, title: "Express実戦ガイド", author: "鈴木" },
];

describe("BookExplorer", () => {
  it("取得が終わるまでローディング表示を出す", () => {
    const neverResolves = () => new Promise<Book[]>(() => {});
    render(<ex.BookExplorer fetchBooks={neverResolves} />);
    expect(screen.getByText(ex.LOADING_TEXT)).toBeInTheDocument();
  });

  it("成功したら取得結果を一覧表示する", async () => {
    const fakeFetchBooks = async () => sampleBooks;
    render(<ex.BookExplorer fetchBooks={fakeFetchBooks} />);
    expect(await screen.findByText("実践TypeScript入門")).toBeInTheDocument();
    expect(screen.getByText("Express実戦ガイド")).toBeInTheDocument();
    expect(screen.queryByText(ex.LOADING_TEXT)).not.toBeInTheDocument();
  });

  it("成功かつ空配列なら「見つかりませんでした」を表示する", async () => {
    const fakeFetchBooks = async () => [];
    render(<ex.BookExplorer fetchBooks={fakeFetchBooks} />);
    expect(await screen.findByText(ex.EMPTY_TEXT)).toBeInTheDocument();
  });

  it("失敗したらrole=alertでエラーメッセージを表示する", async () => {
    const fakeFetchBooks = async (): Promise<Book[]> => {
      throw new Error("ネットワークエラー");
    };
    render(<ex.BookExplorer fetchBooks={fakeFetchBooks} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("エラー: ネットワークエラー");
  });
});
