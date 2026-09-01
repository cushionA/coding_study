// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit07-react-ui/ex01_props_component")
  : await import("../ex01_props_component");

describe("BookCard", () => {
  it("titleを見出し(h3)として表示する", () => {
    render(<ex.BookCard title="実践TypeScript入門" author="佐藤" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "実践TypeScript入門" })
    ).toBeInTheDocument();
  });

  it("authorを「著者: 」付きで表示する", () => {
    render(<ex.BookCard title="Express実戦ガイド" author="鈴木" />);
    expect(screen.getByText("著者: 鈴木")).toBeInTheDocument();
  });

  it("propsを変えると表示内容も変わる(props駆動であることの確認)", () => {
    render(<ex.BookCard title="Prismaで作るWebアプリ" author="田中" />);
    expect(screen.queryByText("実践TypeScript入門")).not.toBeInTheDocument();
    expect(screen.getByText("Prismaで作るWebアプリ")).toBeInTheDocument();
    expect(screen.getByText("著者: 田中")).toBeInTheDocument();
  });

  it("空文字のauthorでもクラッシュせず「著者:」を表示する(境界値)", () => {
    render(<ex.BookCard title="タイトルのみ" author="" />);
    // RTLの既定テキスト正規化は前後の空白をtrimするため、末尾スペースの
    // 有無に依存しない形で「著者:」というプレフィックスの存在だけを確認する
    expect(screen.getByText(/^著者:/)).toBeInTheDocument();
  });
});
