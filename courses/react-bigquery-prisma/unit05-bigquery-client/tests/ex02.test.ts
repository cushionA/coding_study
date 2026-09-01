import { describe, it, expect } from "vitest";
import type { BigQueryLike, QueryOptions } from "../ex02_param_query";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-bigquery-client/ex02_param_query")
  : await import("../ex02_param_query");

// テスト用の超簡易な「クエリエンジン」。本当にSQLを解釈するわけではなく、
// paramsに入っている値だけを見て結果を作る割り切った実装(fake実装への依存性注入)。
function makeFakeBigQuery(books: { author: string }[]): BigQueryLike {
  return {
    async query(opts: QueryOptions) {
      const author = opts.params?.author;
      if (typeof author === "string") {
        const count = books.filter((b) => b.author === author).length;
        return [[{ bookCount: count }]];
      }
      return [[]];
    },
    async estimateQueryBytes() {
      return 0;
    },
    dataset() {
      return {
        table() {
          return { insert: async () => {} };
        },
      };
    },
  };
}

describe("buildCountByAuthorQuery", () => {
  it("クエリ文字列に生の値を埋め込まず、paramsで渡す", () => {
    const result = ex.buildCountByAuthorQuery("夏目漱石");
    expect(result.query).not.toContain("夏目漱石");
    expect(result.query).toContain("@author");
    expect(result.params).toEqual({ author: "夏目漱石" });
  });
});

describe("buildRecentBooksQuery", () => {
  it("since/limitの2つのパラメータをクエリ文字列に埋め込まず渡す", () => {
    const result = ex.buildRecentBooksQuery("2026-01-01T00:00:00Z", 5);
    expect(result.query).not.toContain("2026-01-01T00:00:00Z");
    expect(result.query).toContain("@since");
    expect(result.query).toContain("@limit");
    expect(result.params).toEqual({ since: "2026-01-01T00:00:00Z", limit: 5 });
  });
});

describe("countBooksByAuthor", () => {
  const bq = makeFakeBigQuery([
    { author: "夏目漱石" },
    { author: "夏目漱石" },
    { author: "芥川龍之介" },
  ]);

  it("一致する著者の件数を返す", async () => {
    const count = await ex.countBooksByAuthor(bq, "夏目漱石");
    expect(count).toBe(2);
  });

  it("一致する本が無い著者は0を返す(境界値)", async () => {
    const count = await ex.countBooksByAuthor(bq, "存在しない著者");
    expect(count).toBe(0);
  });
});
