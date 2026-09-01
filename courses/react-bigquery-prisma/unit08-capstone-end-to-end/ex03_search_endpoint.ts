// ex03_search_endpoint: Prisma検索とBigQuery集計を1レスポンスに束ね、
// 片方が落ちても一覧は返す「degrade設計」にする
//
// unit06で作った検索API・unit04のPrisma部分一致検索・unit05のBigQuery集計を
// 1つのエンドポイント用ロジックとして統合する。実務でよくある画面は
// 「本の一覧」と「著者別の件数サマリ」を同じ画面に出すが、この2つは
// 別々のシステム(Prisma=OLTP / BigQuery=OLAP)から来ている。
//
// ここでの設計判断: 一覧(Prisma)はこの検索画面の主役なので、取得できなければ
// エンドポイント自体を失敗させる。一方サマリ(BigQuery集計)は「あれば嬉しい
// 付加情報」なので、集計が失敗しても一覧だけは返す(= 一部の機能が
// 落ちても全体を道連れにしない、degrade=劣化運転という考え方。
// C#で言えば、外部の推薦APIがタイムアウトしても注文確定自体は
// 通す、というサーキットブレーカー的な設計に近い)。

export type SearchedBook = { id: number; isbn: string; title: string; author: string };

// Prisma風の検索リポジトリ。
export interface BookSearchRepositoryLike {
  searchByKeyword(keyword: string): Promise<SearchedBook[]>;
}

export type AuthorCount = { author: string; count: number };

// BigQuery風の集計クライアント。
export interface AnalyticsSummaryLike {
  countByAuthor(keyword: string): Promise<AuthorCount[]>;
}

export type SearchResponse = {
  items: SearchedBook[];
  /** 集計に失敗した場合は null(degrade)。成功時は集計結果の配列。 */
  summary: AuthorCount[] | null;
  /** summaryがnullのときだけ、失敗理由を入れる。成功時は付けない。 */
  summaryError?: string;
};

// repoとanalyticsを両方叩き、1つのSearchResponseにまとめる。
export async function searchBooksWithSummary(
  repo: BookSearchRepositoryLike,
  analytics: AnalyticsSummaryLike,
  keyword: string,
): Promise<SearchResponse> {
  // TODO: 以下の手順で実装する
  // 1. repo.searchByKeyword(keyword) を呼び items を得る。ここが失敗したら
  //    そのままthrowしてよい(一覧の根拠が無い状態でレスポンスを組み立てても
  //    意味がないため、catchしない)
  // 2. analytics.countByAuthor(keyword) を try/catch で包んで呼ぶ。
  //    成功したら summary にその結果配列を入れる(summaryErrorは付けない)。
  //    失敗したら summary を null にし、summaryError に失敗理由
  //    (catchしたerrorのmessage。Errorインスタンスでなければ
  //    Stringに変換したもの)を入れる
  // 3. { items, summary, summaryError? } を返す
  throw new Error("TODO: 未実装");
}

// SearchResponseをログ出力用の1行に整形する。呼び出し側でconsole.logする想定。
export function describeSearchResponse(keyword: string, response: SearchResponse): string {
  // TODO: response.summary が null(degrade)の場合と、値がある場合とで
  // 出し分ける。どちらの文言でも次の情報を必ず含めること:
  //   - keyword の値
  //   - response.items.length(ヒット件数)
  //   - degrade時のみ response.summaryError の内容
  // 文言そのものは自由(例: "検索語『TypeScript』: 2件ヒット" のような形)
  throw new Error("TODO: 未実装");
}
