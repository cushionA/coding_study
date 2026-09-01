// ex03_search_endpoint: Prisma検索とBigQuery集計を1レスポンスに束ね、
// 片方が落ちても一覧は返すdegrade設計にする(解答)

export type SearchedBook = { id: number; isbn: string; title: string; author: string };

export interface BookSearchRepositoryLike {
  searchByKeyword(keyword: string): Promise<SearchedBook[]>;
}

export type AuthorCount = { author: string; count: number };

export interface AnalyticsSummaryLike {
  countByAuthor(keyword: string): Promise<AuthorCount[]>;
}

export type SearchResponse = {
  items: SearchedBook[];
  summary: AuthorCount[] | null;
  summaryError?: string;
};

export async function searchBooksWithSummary(
  repo: BookSearchRepositoryLike,
  analytics: AnalyticsSummaryLike,
  keyword: string,
): Promise<SearchResponse> {
  const items = await repo.searchByKeyword(keyword);

  try {
    const summary = await analytics.countByAuthor(keyword);
    return { items, summary };
  } catch (err) {
    const summaryError = err instanceof Error ? err.message : String(err);
    return { items, summary: null, summaryError };
  }
}

export function describeSearchResponse(keyword: string, response: SearchResponse): string {
  if (response.summary === null) {
    return `検索語『${keyword}』: ${response.items.length}件ヒット(集計は失敗: ${response.summaryError})`;
  }
  return `検索語『${keyword}』: ${response.items.length}件ヒット(著者別集計 ${response.summary.length}件)`;
}
