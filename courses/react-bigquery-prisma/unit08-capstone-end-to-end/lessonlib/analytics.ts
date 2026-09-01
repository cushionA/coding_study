/* =====================================================================
 * lesson / 演習用の「分析側(BigQuery)」の下ごしらえ
 * ---------------------------------------------------------------------
 * unit05 で使った偽 BigQuery(lessonlib/fakeBigQuery.ts)をそのまま再利用します。
 * ここで足すのは、このユニットで使うテーブル1本のスキーマと、その生成関数だけです。
 *
 * テーブル: app_analytics.book_ingest_events
 *   「取り込みで見かけた本」を1行1イベントとして積む、追記専用の分析テーブル。
 *   ★ batch_id が入っているのが今日の肝です。これは Prisma 側の IngestRun.id と
 *     同じ値で、**2つのストアを突き合わせる鍵(突合キー)** になります。
 *     「9月5日の取り込みは Prisma に6件、BigQuery に何件入った?」を
 *     後から検算できるのは、この列があるからです。
 * ===================================================================== */

import {
  createFakeBigQuery,
  type BqSchema,
  type BigQueryLike,
  type FakeBigQuery,
  type Row,
  type TableLike,
} from "../../unit05-bigquery-client/lessonlib/fakeBigQuery.js";

export type { BigQueryLike, FakeBigQuery, Row, TableLike };

export const DATASET_ID = "app_analytics";
export const TABLE_ID = "book_ingest_events";

export const BOOK_INGEST_SCHEMA: BqSchema = {
  fields: [
    { name: "event_id", type: "STRING", mode: "REQUIRED" },     // バッチID + ISBN で一意にする
    { name: "batch_id", type: "STRING", mode: "REQUIRED" },     // ← 突合キー(= IngestRun.id)
    { name: "ingested_at", type: "TIMESTAMP", mode: "REQUIRED" },
    { name: "event_date", type: "DATE", mode: "REQUIRED" },     // パーティション列のつもり(unit05 概念5)
    { name: "isbn", type: "STRING", mode: "REQUIRED" },
    { name: "title", type: "STRING", mode: "REQUIRED" },
    { name: "author", type: "STRING", mode: "REQUIRED" },
    { name: "published_year", type: "INT64", mode: "NULLABLE" },
    { name: "source", type: "STRING", mode: "REQUIRED" },
  ],
};

/** まっさらな偽 BigQuery(book_ingest_events テーブル1本だけ)を作る。 */
export function createAnalyticsBq(rows: Row[] = []): FakeBigQuery {
  return createFakeBigQuery({
    projectId: "my-bq-study-001",
    datasetId: DATASET_ID,
    tables: { [TABLE_ID]: { schema: BOOK_INGEST_SCHEMA, rows } },
  });
}
