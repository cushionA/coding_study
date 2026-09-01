/* =====================================================================
 * 【任意】実プロジェクトに1回だけ繋いで確かめるスモークテスト
 * ---------------------------------------------------------------------
 * このコースの lesson と演習は、すべてインメモリの偽 BigQuery で完結します。
 * このファイルだけが「本物の GCP に繋ぐ」唯一の場所です。
 * **実行は完全に任意**。GCP アカウントが無い人はスキップしてください
 * (環境変数が無ければ、このスクリプトは何もせず正常終了します)。
 *
 * 事前準備(コース直下 README.md の
 *   「BigQuery を実際に動かすための前提(unit05 以降・任意だが強く推奨)」):
 *   1. GCP プロジェクトを作る
 *   2. BigQuery API を有効化する
 *   3. データセット app_analytics(ロケーション asia-northeast1)を作る
 *   4. サービスアカウントを作り、roles/bigquery.dataEditor と
 *      roles/bigquery.jobUser を付ける
 *   5. JSON 鍵を発行し、**リポジトリの外**に置く(絶対にコミットしない)
 *   6. コース直下の .env に次を書く:
 *        GOOGLE_APPLICATION_CREDENTIALS=<鍵ファイルの絶対パス>
 *        GCP_PROJECT_ID=<プロジェクトID>
 *        BQ_DATASET=app_analytics
 *
 * 実行(cwd はコースディレクトリ):
 *   npx tsx unit05-bigquery-client/optional_smoke_test.ts
 *
 * 何をするか:
 *   ① データセット一覧を取得する(読み取りだけ。課金はほぼゼロ)
 *   ② SELECT 1 相当の極小クエリを dryRun で見積もる(実行しないので無料)
 *   ③ 指定データセットのテーブル一覧を表示する
 *   ★ 書き込み(insert)やテーブル作成は **一切しません**。
 * ===================================================================== */

import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = process.env.GCP_PROJECT_ID;
const datasetId = process.env.BQ_DATASET ?? "app_analytics";

if (!keyPath || !projectId) {
  console.log("[スキップ] GOOGLE_APPLICATION_CREDENTIALS と GCP_PROJECT_ID が設定されていません。");
  console.log("           GCP を使わない場合、これで問題ありません。lesson と演習は偽クライアントで完結します。");
  console.log("           繋いでみたくなったら、コース直下の README.md の前提セクションを参照してください。");
} else {
  console.log("プロジェクト:", projectId, "/ 鍵:", keyPath);
  const bq = new BigQuery({ projectId });

  // ① 認証が通っているか(ここで初めてネットワークが動く)
  const [datasets] = await bq.getDatasets();
  console.log("① データセット一覧 =", datasets.map((d) => d.id).join(", ") || "(0件)");

  // ② dryRun で見積りだけ取る(実行しないので無料)
  const [job] = await bq.createQueryJob({
    query: "SELECT @n AS n",
    params: { n: 1 },
    dryRun: true,
  });
  console.log("② dryRun の見積りバイト数 =", job.metadata.statistics.totalBytesProcessed);

  // ③ データセットの中のテーブル一覧
  const [tables] = await bq.dataset(datasetId).getTables();
  console.log(`③ ${datasetId} のテーブル =`, tables.map((t) => t.id).join(", ") || "(0件)");

  console.log("スモークテスト成功。実プロジェクトへの接続が確認できました。");
}

export {};
