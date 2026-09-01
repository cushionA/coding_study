// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit07-react-ui/ex02_state_events")
  : await import("../ex02_state_events");

describe("BookStatusToggle", () => {
  it("初期状態(省略時)は貸出可・ボタンは「貸出する」", () => {
    render(<ex.BookStatusToggle title="実践TypeScript入門" />);
    expect(screen.getByText("貸出可")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "貸出する" })).toBeInTheDocument();
  });

  it("initialBorrowed=trueを渡すと最初から貸出中になる", () => {
    render(<ex.BookStatusToggle title="Express実戦ガイド" initialBorrowed={true} />);
    expect(screen.getByText("貸出中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返却する" })).toBeInTheDocument();
  });

  it("ボタンを1回クリックすると貸出中に変わる", () => {
    render(<ex.BookStatusToggle title="Prismaで作るWebアプリ" />);
    fireEvent.click(screen.getByRole("button", { name: "貸出する" }));
    expect(screen.getByText("貸出中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返却する" })).toBeInTheDocument();
    expect(screen.queryByText("貸出可")).not.toBeInTheDocument();
  });

  it("2回クリックすると元の貸出可に戻る(トグルであることの確認)", () => {
    render(<ex.BookStatusToggle title="BigQuery入門" />);
    const firstButton = screen.getByRole("button", { name: "貸出する" });
    fireEvent.click(firstButton);
    fireEvent.click(screen.getByRole("button", { name: "返却する" }));
    expect(screen.getByText("貸出可")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "貸出する" })).toBeInTheDocument();
  });
});
