// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit08-capstone-end-to-end/ex01_search_input")
  : await import("../ex01_search_input");

describe("SearchBox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("入力直後(デバウンス時間が経過するまで)はonSearchを呼ばない", () => {
    const onSearch = vi.fn();
    render(<ex.SearchBox onSearch={onSearch} />);
    const input = screen.getByRole("textbox", { name: "検索" });
    fireEvent.change(input, { target: { value: "本" } });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("デバウンス時間が経過したら最後に入力した値でonSearchを呼ぶ", () => {
    const onSearch = vi.fn();
    render(<ex.SearchBox onSearch={onSearch} debounceMs={300} />);
    const input = screen.getByRole("textbox", { name: "検索" });
    fireEvent.change(input, { target: { value: "本" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("本");
  });

  it("デバウンス時間内の連続入力は、最後の値だけで1回onSearchを呼ぶ", () => {
    const onSearch = vi.fn();
    render(<ex.SearchBox onSearch={onSearch} debounceMs={300} />);
    const input = screen.getByRole("textbox", { name: "検索" });

    fireEvent.change(input, { target: { value: "あ" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "あい" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "あいう" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("あいう");
  });

  it("initialQueryが渡されていれば入力欄の初期表示値になる(境界値)", () => {
    const onSearch = vi.fn();
    render(<ex.SearchBox onSearch={onSearch} initialQuery="既存の検索語" />);
    const input = screen.getByRole("textbox", { name: "検索" }) as HTMLInputElement;
    expect(input.value).toBe("既存の検索語");
  });
});
