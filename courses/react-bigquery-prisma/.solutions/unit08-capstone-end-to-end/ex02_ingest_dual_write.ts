// ex02_ingest_dual_write: 外部API → Prisma(正) → BigQuery(分析副本)の
// 二重書き込みを冪等に行う(解答)

export type SourceBookDto = {
  isbn: string;
  title: string;
  author_name: string;
  first_publish_year: number | null;
};

export type FetchSourceBooks = () => Promise<SourceBookDto[]>;

export type BookInput = {
  isbn: string;
  title: string;
  author: string;
  publishedYear: number | null;
};

export interface BookRepositoryLike {
  upsertByIsbn(book: BookInput): Promise<void>;
}

export type AnalyticsBookRow = {
  isbn: string;
  title: string;
  author: string;
  batchId: string;
  ingestedAt: string;
};

export interface AnalyticsWriterLike {
  insertBookRow(row: AnalyticsBookRow): Promise<void>;
}

export type AnalyticsFailure = { isbn: string; reason: string };

export type IngestSummary = {
  batchId: string;
  ingestedCount: number;
  analyticsFailures: AnalyticsFailure[];
};

export function toBookInput(dto: SourceBookDto): BookInput {
  return {
    isbn: dto.isbn,
    title: dto.title,
    author: dto.author_name,
    publishedYear: dto.first_publish_year,
  };
}

export async function ingestBooks(
  fetchSourceBooks: FetchSourceBooks,
  repo: BookRepositoryLike,
  analytics: AnalyticsWriterLike,
  batchId: string,
  now: () => string,
): Promise<IngestSummary> {
  const dtos = await fetchSourceBooks();
  const analyticsFailures: AnalyticsFailure[] = [];
  let ingestedCount = 0;

  for (const dto of dtos) {
    const input = toBookInput(dto);
    await repo.upsertByIsbn(input);
    ingestedCount += 1;

    try {
      await analytics.insertBookRow({
        isbn: input.isbn,
        title: input.title,
        author: input.author,
        batchId,
        ingestedAt: now(),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      analyticsFailures.push({ isbn: input.isbn, reason });
    }
  }

  return { batchId, ingestedCount, analyticsFailures };
}
