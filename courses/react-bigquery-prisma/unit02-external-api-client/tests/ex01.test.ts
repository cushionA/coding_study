import { describe, it, expect } from "vitest";
import type { BookApiDto } from "../ex01_parse_response";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-external-api-client/ex01_parse_response")
  : await import("../ex01_parse_response");

function dto(overrides: Partial<BookApiDto> = {}): BookApiDto {
  return {
    book_id: 1,
    book_title: "TypeScript実践入門",
    author_name: "佐藤",
    publish_year: 2024,
    ...overrides,
  };
}

describe("toBook", () => {
  it("snake_caseのDTOをcamelCaseのBookに変換する", () => {
    const result = ex.toBook(dto());
    expect(result).toEqual({
      id: 1,
      title: "TypeScript実践入門",
      author: "佐藤",
      publishYear: 2024,
    });
  });

  it("titleとauthorの前後の空白をtrimする", () => {
    const result = ex.toBook(dto({ book_title: "  余白あり  ", author_name: " 鈴木 " }));
    expect(result.title).toBe("余白あり");
    expect(result.author).toBe("鈴木");
  });

  it("publish_yearがnullならpublishYearもnullのまま(境界値)", () => {
    const result = ex.toBook(dto({ publish_year: null }));
    expect(result.publishYear).toBeNull();
  });
});

describe("toBooks", () => {
  it("複数件のDTOをまとめて変換する", () => {
    const result = ex.toBooks([dto({ book_id: 1 }), dto({ book_id: 2, book_title: "本2" })]);
    expect(result).toEqual([
      { id: 1, title: "TypeScript実践入門", author: "佐藤", publishYear: 2024 },
      { id: 2, title: "本2", author: "佐藤", publishYear: 2024 },
    ]);
  });

  it("空配列を渡すと空配列が返る(境界値)", () => {
    expect(ex.toBooks([])).toEqual([]);
  });
});

describe("booksByAuthor", () => {
  const books = [
    { id: 1, title: "本A", author: "田中太郎", publishYear: 2020 },
    { id: 2, title: "本B", author: "山田花子", publishYear: 2021 },
    { id: 3, title: "本C", author: "田中太郎", publishYear: 2022 },
  ];

  it("著者名が完全一致するBookをすべて返す", () => {
    const result = ex.booksByAuthor(books, "田中太郎");
    expect(result.map((b) => b.id)).toEqual([1, 3]);
  });

  it("大文字小文字と前後の空白を無視して一致させる", () => {
    const alpha = [{ id: 9, title: "Foo", author: "John Smith", publishYear: 2023 }];
    const result = ex.booksByAuthor(alpha, "  john smith  ");
    expect(result.map((b) => b.id)).toEqual([9]);
  });

  it("一致する著者がいなければ空配列を返す", () => {
    const result = ex.booksByAuthor(books, "存在しない人");
    expect(result).toEqual([]);
  });
});
