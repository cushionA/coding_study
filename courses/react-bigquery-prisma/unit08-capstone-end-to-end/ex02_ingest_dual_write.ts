// ex02_ingest_dual_write: 外部API → Prisma(正) → BigQuery(分析副本) の
// 二重書き込みを冪等に行う
//
// unit02で作ったAPIクライアント、unit04で作ったPrismaのupsert、unit05で
// 作ったBigQueryへのinsertを、実務でよくある「取り込みジョブ」の形に
// 束ねる回。ここでの核心は次の設計判断:
//
//   ・2つのストア(Prisma / BigQuery)にまたがる書き込みは、C#で言う
//     TransactionScopeのような「両方まとめてロールバック」ができない
//     (別々のシステムだから)。だから「どちらを正とするか」を先に決める。
//   ・このユニットではPrisma(アプリDB)を正とする。Prismaへの書き込みが
//     失敗したら、そのデータの取り込みは失敗として扱ってよい(呼び出し元へ
//     そのままthrowする)。
//   ・BigQueryは分析用の副本(コピー)にすぎないので、そこへの書き込みが
//     失敗しても取り込みジョブ全体は成功したことにする。失敗は握りつぶさず
//     ログ(戻り値のanalyticsFailures)に残し、後で再送できるようにする。
//   ・後から「Prismaにはあるのに分析には無い行」を突き合わせられるように、
//     取り込みバッチID(batchId)を両方の書き込みに含めておく(突合キー)。
//
// isbn(本の識別コード)をキーにしてupsertするので、同じ外部データを
// 何度取り込んでもPrisma側の行数は増えない(= 冪等)。

// 外部APIが返す生データ(DTO)。実務ではスネークケースで来ることが多い。
export type SourceBookDto = {
  isbn: string;
  title: string;
  author_name: string;
  first_publish_year: number | null;
};

export type FetchSourceBooks = () => Promise<SourceBookDto[]>;

// アプリ内部のドメイン形(camelCase)。Prismaへ渡す入力にそのまま使える。
export type BookInput = {
  isbn: string;
  title: string;
  author: string;
  publishedYear: number | null;
};

// Prisma風の「正」のリポジトリ。isbnをキーに冪等保存する。
export interface BookRepositoryLike {
  upsertByIsbn(book: BookInput): Promise<void>;
}

// BigQueryへ1行分として送る形。batchIdが突合キー。
export type AnalyticsBookRow = {
  isbn: string;
  title: string;
  author: string;
  batchId: string;
  ingestedAt: string;
};

// BigQuery風の「分析用副本」への書き込み。失敗することがある。
export interface AnalyticsWriterLike {
  insertBookRow(row: AnalyticsBookRow): Promise<void>;
}

export type AnalyticsFailure = { isbn: string; reason: string };

export type IngestSummary = {
  batchId: string;
  ingestedCount: number;
  analyticsFailures: AnalyticsFailure[];
};

// SourceBookDto(外部の生データ)を、Prismaへ渡せるBookInputへ変換する。
// author_name → author、first_publish_year → publishedYear への
// リネームだけを行う(値そのものは変えない)。
export function toBookInput(dto: SourceBookDto): BookInput {
  // TODO: dto.isbn / dto.title はそのまま、dto.author_name を author に、
  // dto.first_publish_year を publishedYear にリネームして返す
  throw new Error("TODO: 未実装");
}

// 取り込みジョブ本体。fetchSourceBooksで外部データを取得し、各行を
// toBookInputで変換したうえでPrisma(正)へupsertし、続けてBigQuery
// (分析副本)へも書き込む。
export async function ingestBooks(
  fetchSourceBooks: FetchSourceBooks,
  repo: BookRepositoryLike,
  analytics: AnalyticsWriterLike,
  batchId: string,
  now: () => string,
): Promise<IngestSummary> {
  // TODO: 以下の手順で実装する
  // 1. fetchSourceBooks() で外部データ(SourceBookDto[])を取得する
  // 2. 各要素を toBookInput で変換し、repo.upsertByIsbn で正のストアへ
  //    保存する。ここが失敗したら関数全体を失敗させてよい(catchせず、
  //    そのままエラーが外へ伝わるに任せる)
  // 3. 正のストアへ保存できた各行について、analytics.insertBookRow への
  //    書き込みを1件ずつ try/catch で包んで実行する
  //    ({ isbn, title, author, batchId, ingestedAt: now() } を渡す)。
  //    ここは成功しても失敗しても取り込み処理自体は続行する
  //    (副本が落ちていても取り込みは成功扱いにする、という設計方針)。
  //    失敗した場合は { isbn, reason } を analyticsFailures に積む
  //    (reasonはcatchしたerrorのmessage。Errorインスタンスでなければ
  //    Stringに変換したものを使う)
  // 4. { batchId, ingestedCount: 保存できた件数, analyticsFailures } を返す
  throw new Error("TODO: 未実装");
}
