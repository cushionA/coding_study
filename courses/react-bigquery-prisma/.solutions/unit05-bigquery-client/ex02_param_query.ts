// ex02_param_query: パラメータ化クエリでBigQueryに問い合わせる
// 文字列連結でSQLを組み立てると、値に " や -- が混ざった瞬間にSQLインジェクションの
// 入口になる(C#で言えば SqlCommand.CommandText に文字列連結で値を埋め込むのと
// 同じアンチパターン)。BigQueryの `query({ query, params })` は、Dapperの
// `@author` プレースホルダー + `new { author }`、あるいはADO.NETの
// `cmd.Parameters.AddWithValue("@author", author)` に相当する仕組みを持つ。
// クエリ文字列には `@paramName` とだけ書き、実際の値は params オブジェクトで渡す。
//
// 実GCPには繋がない。BigQueryLikeという最小インターフェースをここで定義し、
// テストではインメモリのfake実装を注入する(依存性注入)。

export type QueryRows = Record<string, unknown>[];

export type QueryOptions = {
  query: string;
  params?: Record<string, unknown>;
};

// このユニット全体で使う、BigQueryクライアントの最小インターフェース。
// 実際の @google-cloud/bigquery の一部だけを切り出した形(依存性逆転)。
export type BigQueryLike = {
  query(opts: QueryOptions): Promise<[QueryRows]>;
  // dryRun相当: 実際には実行せず、「もし実行したら何バイトスキャンするか」だけを返す(ex04で使う)。
  estimateQueryBytes(opts: QueryOptions): Promise<number>;
  dataset(id: string): {
    table(id: string): {
      // 一部の行だけ失敗することがある(RDBのINSERTにはない挙動)。
      // 失敗時はPartialFailureError(ex03で定義)相当のエラーをthrowする想定。
      insert(rows: Record<string, unknown>[]): Promise<void>;
    };
  };
};

// 「著者名で件数を数える」パラメータ化クエリを組み立てる。
// クエリ文字列にauthorの値を直接埋め込まないこと(@authorというプレースホルダーのみ書く)。
export function buildCountByAuthorQuery(author: string): QueryOptions {
  return {
    query: "SELECT COUNT(*) AS bookCount FROM `app_analytics.books` WHERE author = @author",
    params: { author },
  };
}

// 指定タイムスタンプ以降に取り込まれた本を、件数上限付きで取得するクエリを組み立てる。
// パラメータを複数(@since, @limit)使う練習。
export function buildRecentBooksQuery(sinceTimestamp: string, limit: number): QueryOptions {
  return {
    query:
      "SELECT * FROM `app_analytics.books` WHERE ingested_at >= @since ORDER BY ingested_at LIMIT @limit",
    params: { since: sinceTimestamp, limit },
  };
}

// buildCountByAuthorQueryとBigQueryLikeを組み合わせて、実際に件数を取得する。
export async function countBooksByAuthor(bq: BigQueryLike, author: string): Promise<number> {
  const [rows] = await bq.query(buildCountByAuthorQuery(author));
  const first = rows[0];
  if (!first || typeof first.bookCount !== "number") {
    return 0;
  }
  return first.bookCount;
}
