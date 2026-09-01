// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit08-capstone-end-to-end/ex04_capstone")
  : await import("../ex04_capstone");

type SearchResponse = {
  items: { id: number; isbn: string; title: string; author: string }[];
  summary: { author: string; count: number }[] | null;
  summaryError?: string;
};

const sampleResponse: SearchResponse = {
  items: [{ id: 1, isbn: "978-4-00-1", title: "実践TypeScript入門", author: "佐藤" }],
  summary: [{ author: "佐藤", count: 1 }],
};

async function typeAndDebounce(input: HTMLElement, value: string, debounceMs = 300): Promise<void> {
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(debounceMs);
  });
}

describe("SearchPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態ではまだ検索していないことを示す表示を出す", () => {
    const searchBooks = vi.fn();
    render(<ex.SearchPage searchBooks={searchBooks} />);
    expect(screen.getByText(ex.IDLE_TEXT)).toBeInTheDocument();
    expect(searchBooks).not.toHaveBeenCalled();
  });

  it("検索語入力→デバウンス後にsearchBooksを呼び、結果の一覧とサマリを表示する", async () => {
    const searchBooks = vi.fn().mockResolvedValue(sampleResponse);
    render(<ex.SearchPage searchBooks={searchBooks} debounceMs={300} />);
    const input = screen.getByRole("textbox", { name: "検索" });

    await typeAndDebounce(input, "TypeScript");

    expect(searchBooks).toHaveBeenCalledTimes(1);
    expect(searchBooks).toHaveBeenCalledWith("TypeScript");
    expect(screen.getByText("実践TypeScript入門")).toBeInTheDocument();
  });

  it("BigQuery集計がdegradeしていたら一覧は出しつつ集計不可の表示を出す", async () => {
    const searchBooks = vi.fn().mockResolvedValue({
      items: sampleResponse.items,
      summary: null,
      summaryError: "BigQueryタイムアウト",
    });
    render(<ex.SearchPage searchBooks={searchBooks} debounceMs={300} />);
    const input = screen.getByRole("textbox", { name: "検索" });

    await typeAndDebounce(input, "TypeScript");

    expect(screen.getByText("実践TypeScript入門")).toBeInTheDocument();
    expect(screen.getByText(ex.SUMMARY_UNAVAILABLE_TEXT)).toBeInTheDocument();
  });

  it("searchBooksが失敗したらrole=alertでエラーメッセージを表示する", async () => {
    const searchBooks = vi.fn().mockRejectedValue(new Error("ネットワークエラー"));
    render(<ex.SearchPage searchBooks={searchBooks} debounceMs={300} />);
    const input = screen.getByRole("textbox", { name: "検索" });

    await typeAndDebounce(input, "TypeScript");

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("エラー: ネットワークエラー");
  });

  it("該当0件なら一覧が空である旨を表示する(境界値)", async () => {
    const searchBooks = vi.fn().mockResolvedValue({ items: [], summary: [] });
    render(<ex.SearchPage searchBooks={searchBooks} debounceMs={300} />);
    const input = screen.getByRole("textbox", { name: "検索" });

    await typeAndDebounce(input, "存在しない語");

    expect(screen.getByText(ex.NO_RESULTS_TEXT)).toBeInTheDocument();
  });
});
