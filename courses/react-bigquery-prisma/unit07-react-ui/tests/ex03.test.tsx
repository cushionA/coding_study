// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit07-react-ui/ex03_list_render")
  : await import("../ex03_list_render");

const sample = [
  { id: 1, title: "実践TypeScript入門", author: "佐藤" },
  { id: 2, title: "Express実戦ガイド", author: "鈴木" },
  { id: 3, title: "Prismaで作るWebアプリ", author: "田中" },
];

describe("getBookKey", () => {
  it("book.idを文字列化して返す", () => {
    expect(ex.getBookKey({ id: 42, title: "x", author: "y" })).toBe("42");
  });

  it("id=0でも文字列'0'を返す(境界値: falsyな値)", () => {
    expect(ex.getBookKey({ id: 0, title: "x", author: "y" })).toBe("0");
  });
});

describe("BookList", () => {
  it("各bookをtitle — authorの形式で一覧表示する", () => {
    render(<ex.BookList books={sample} />);
    expect(screen.getByText("実践TypeScript入門 — 佐藤")).toBeInTheDocument();
    expect(screen.getByText("Express実戦ガイド — 鈴木")).toBeInTheDocument();
    expect(screen.getByText("Prismaで作るWebアプリ — 田中")).toBeInTheDocument();
  });

  it("booksの件数だけ<li>を描画する", () => {
    render(<ex.BookList books={sample} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(sample.length);
  });

  it("空配列のときEMPTY_MESSAGEを表示し<li>は描画しない(境界値)", () => {
    render(<ex.BookList books={[]} />);
    expect(screen.getByText(ex.EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
