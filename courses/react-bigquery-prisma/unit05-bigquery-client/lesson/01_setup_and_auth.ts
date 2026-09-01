/* =====================================================================
 * 概念1: BigQuery クライアントの作り方と、認証(ADC)の仕組み
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit03/04 で作ったのは「アプリDB(OLTP)側」——1冊の本を正確に読み書き
 *   する世界でした。今日からは反対側、「分析(OLAP)側」を担当します。
 *   実務でこの担当になると、最初の1日はほぼ確実に **認証で溶けます**。
 *   「ローカルでは動くのに Cloud Run に載せたら 403」「同僚の環境では動く」
 *   —— この手の事故はすべて、これから説明する ADC の仕組みを知らないまま
 *   環境変数をコピペしたことが原因です。逆に ADC の解決順序さえ頭に入って
 *   いれば、原因の切り分けは数分で終わります。
 *   だから今日の1本目は「まだクエリを投げない」回です。
 *
 * ■ このユニットの実行環境について(重要):
 *   このコースは **GCP アカウントが無くても全課題に合格できる**設計です。
 *   lesson/03 以降では、本物の BigQuery の代わりにインメモリの「偽物
 *   クライアント」を注入して学びます。ネットワークには一切出ません。
 *   実際の GCP プロジェクトに繋ぐ手順(プロジェクト作成 → BigQuery API
 *   有効化 → データセット作成 → サービスアカウント + ロール付与 → JSON鍵
 *   → 環境変数)は、コース直下の README.md の
 *   **「BigQuery を実際に動かすための前提(unit05 以降・任意だが強く推奨)」**
 *   に手順化してあります。アカウントを持っている人は、この lesson を終えた後に
 *   `unit05-bigquery-client/optional_smoke_test.ts` を実行すると、
 *   本物に1回だけ繋いで確かめられます(持っていない人はスキップで構いません)。
 *
 * ■ 解説:
 *
 *   ● クライアントを作る
 *       import { BigQuery } from "@google-cloud/bigquery";
 *       const bq = new BigQuery({ projectId: "my-bq-study-001" });
 *
 *     `BigQuery` は「BigQuery API を叩くための入口オブジェクト」です。
 *     C# で言えば HttpClient や DbContext のような、アプリで1個作って
 *     使い回す種類のオブジェクト。リクエストのたびに new しません。
 *
 *     ★ ここが最初の勘所: **new した時点では通信も認証もしていません。**
 *       コンストラクタは「設定を覚えるだけ」。実際に鍵を読み、トークンを
 *       取りに行くのは、最初に .query() などを呼んだ瞬間(遅延評価)です。
 *       C# の `new HttpClient()` が何も通信しないのと同じ感覚です。
 *       → だから「鍵のパスを間違えていた」は new では発覚せず、
 *         最初のクエリで初めて爆発します。
 *
 *   ● projectId は何のためにあるか
 *     GCP のリソースはすべて「プロジェクト」という箱に属します。BigQuery では
 *     projectId が2つの意味を持ちます:
 *       (1) **課金先** — 誰の財布でこのクエリを実行するか
 *       (2) **既定の名前解決** — テーブル名を省略記法で書いたときの補完先
 *     省略すると、クライアントは後で ADC の資格情報からプロジェクトを推測
 *     しようとします(推測に失敗すると実行時エラー)。実務では明示します。
 *
 *   ● ADC = Application Default Credentials(いちばん大事な概念)
 *     Google のクライアントライブラリは、**コードに鍵を書かせない**ために
 *     「決まった場所を決まった順番で探す」という共通ルールを持っています。
 *     これが ADC です。探索順(上から順に、見つかった時点で確定):
 *
 *       1. 環境変数 GOOGLE_APPLICATION_CREDENTIALS が指す **JSON鍵ファイル**
 *          → サーバやCIで使う「サービスアカウント」の鍵。
 *       2. `gcloud auth application-default login` で作られる
 *          **ローカルのユーザー資格情報ファイル**
 *          → 開発者が自分のPCで、自分のGoogleアカウントとして動かすとき。
 *       3. 実行環境に紐づいた **メタデータサーバ**
 *          → Cloud Run / GCE / Cloud Functions 上では、鍵ファイルを1つも
 *            置かなくても「このサービスに割り当てられたサービスアカウント」
 *            として自動的に認証される。**本番で鍵ファイルを配らない**ための
 *            仕組みで、これが理想形です。
 *       4. どれも無ければ → 最初の API 呼び出しで
 *          "Could not load the default credentials" というエラー。
 *
 *     C# アナロジー: Azure SDK の `DefaultAzureCredential` が
 *     「環境変数 → マネージドID → Visual Studio → Azure CLI」と順番に
 *     試すのとまったく同じ設計です。「どの資格情報が採用されたか」を
 *     意識せずに書けるのが利点であり、同時に事故の温床でもあります。
 *
 *   ● keyFilename というオプションもあるが……
 *       new BigQuery({ projectId, keyFilename: "./key.json" })   // 動くが非推奨
 *     鍵の場所をコードに焼き込むと、環境ごとにコードを書き換えることになり、
 *     うっかりコミットする事故も起きます。**環境変数(=ADC)に寄せる**のが原則。
 *     これは unit01 概念4 でやった「秘密は .env に置きコードに書かない」の続きです。
 *
 *   ● 権限(ロール)の話 —— 認証と認可は別物
 *     「誰か(認証)」が通っても「何をしてよいか(認可)」は別に決まります。
 *     BigQuery でよく使う2つ:
 *       ・roles/bigquery.dataEditor … テーブルの作成・行の書き込みができる
 *       ・roles/bigquery.jobUser    … **クエリを実行**できる(ジョブを作れる)
 *     「SELECT が Permission denied になる」の典型原因は jobUser の付け忘れです。
 *     オーナー権限を付けて解決しないこと(最小権限が原則)。
 *
 *   ● ロケーション
 *     データセットには作成時にロケーション(例 asia-northeast1)を決め、
 *     **後から変更できません**。クエリはデータと同じロケーションで実行されます。
 *     別ロケーションのテーブルを JOIN することもできません。最初の設計が効きます。
 *
 *   ■ このファイルで使う新しい API:
 *     ・new BigQuery({ projectId })  … クライアント生成。通信はしない。
 *     ・bq.projectId                 … 覚えているプロジェクトID(文字列)
 *     ・bq.dataset(id)               … データセットの「ハンドル」を得る。通信はしない。
 *     ・dataset.table(id)            … テーブルの「ハンドル」を得る。通信はしない。
 * ===================================================================== */

import { BigQuery } from "@google-cloud/bigquery";

// check ヘルパー(全 lesson ファイル共通・先頭に配置)
function check(name: string, actual: unknown, expected: unknown, hint = ""): boolean {
  const ok = actual !== null && actual !== undefined
    && JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) console.log(`[OK] ${name}: 正解!`);
  else {
    console.log(`[NG] ${name}: 期待値 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`);
    if (hint) console.log(`     ヒント: ${hint}`);
  }
  return ok;
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「クライアントを作る」「テーブルのハンドルを得る」ところまでは
//       ネットワークが1バイトも動かないことを、自分の目で確認する。

// STEP 1: クライアントを作る。ここでは鍵も読まれないし、トークンも取りに行かない。
const bq = new BigQuery({ projectId: "my-bq-study-001" });
console.log("STEP 1: new BigQuery(...) 完了。bq.projectId =", bq.projectId);

// STEP 2: データセット/テーブルの「ハンドル」を得る。これもまだ通信ではない。
//         (存在しないデータセット名を書いてもここでは何も起きない — 確かめてみてください)
const dataset = bq.dataset("app_analytics");
const table = dataset.table("book_events");
console.log("STEP 2: dataset.id =", dataset.id, "/ table.id =", table.id);
console.log("STEP 2: 完全修飾名 =", `${bq.projectId}.${dataset.id}.${table.id}`);
console.log("        ↑ BigQuery の名前は必ず『プロジェクト . データセット . テーブル』の3階層。");

// STEP 3: 今この環境で ADC はどうなっているか(環境変数を覗くだけ。通信はしない)
const adcEnvSnapshot = {
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "(未設定)",
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ?? "(未設定)",
  BQ_DATASET: process.env.BQ_DATASET ?? "(未設定)",
};
console.log("STEP 3: ADC 関連の環境変数 =", adcEnvSnapshot);
console.log("        ↑ 未設定でもこのファイルは最後まで動きます(API を1回も呼ばないから)。");

// STEP 4: 「認証情報が無い/間違っている」ことは、new では絶対に発覚しない
const bqWithBadKey = new BigQuery({ projectId: "p", keyFilename: "/nowhere/does-not-exist.json" });
console.log("STEP 4: 存在しない鍵ファイルを指定しても new は成功する。projectId =", bqWithBadKey.projectId);
console.log("        ↑ この設定ミスは、最初に .query() を呼んだ瞬間に初めて例外になる。");
console.log("        『new は通ったのに動かない』の正体はこれ。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) new BigQuery() を **引数なし** で作ったら、bq.projectId は何になる?
//       undefined? 空文字? 例外? それとも第4の答え?
//   (2) 存在しないデータセット名 bq.dataset("no_such_dataset") を書いたら、
//       その行で例外になる? ならない?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const bqNoArgs = new BigQuery();
console.log("変えてみる (1): 引数なしの projectId =", JSON.stringify(bqNoArgs.projectId));
console.log("        ↑ これは『まだ決まっていない』ことを表すプレースホルダ。");
console.log("        最初の API 呼び出しの直前に、ADC から取得した値で置き換えられる。");
console.log("        つまり projectId 未指定の事故も、やはり new では発覚しない。");

const ghostDataset = bqNoArgs.dataset("no_such_dataset");
console.log("変えてみる (2): 存在しないデータセットのハンドル =", ghostDataset.id, "→ 例外は起きない");
console.log("        ハンドルは『住所を書いた紙』にすぎず、実在確認は通信して初めて行われる。");

// --- 書いてみる ---------------------------------------------------------
// 課題: 「この環境では ADC のどれが採用されるか」を判定する関数
//        resolveAdcSource を完成させてください。
//        解説の探索順(1→2→3、どれも無ければ none)をそのまま実装します。
//
//   env.GOOGLE_APPLICATION_CREDENTIALS … 鍵ファイルのパス(未設定なら undefined)
//   env.hasGcloudAdcFile               … gcloud のユーザー資格情報ファイルがあるか
//   env.onGoogleCloud                  … Cloud Run / GCE 上で動いているか
//
// ヒント(概念レベル): 上から順に if で返すだけ。優先順位が全てです。
type AdcEnv = {
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  hasGcloudAdcFile?: boolean;
  onGoogleCloud?: boolean;
};
type AdcSource = "key-file" | "gcloud-user" | "metadata-server" | "none";

function resolveAdcSource(env: AdcEnv): AdcSource {
  // ここに書く(探索順に判定して、対応する文字列を返す)
  return "none"; // ← 仮の戻り値。書き換えてください
}

const result1 = [
  // 3つとも揃っている環境(CI サーバで鍵も置いてある、など)
  resolveAdcSource({ GOOGLE_APPLICATION_CREDENTIALS: "/home/me/.gcp/key.json", hasGcloudAdcFile: true, onGoogleCloud: true }),
  // 鍵ファイルは無いが、開発者が gcloud でログイン済みの自分のPC
  resolveAdcSource({ hasGcloudAdcFile: true, onGoogleCloud: true }),
  // 何も置いていない Cloud Run 上(理想形)
  resolveAdcSource({ onGoogleCloud: true }),
  // 素の CI コンテナ(ここで初めてエラーになる)
  resolveAdcSource({}),
];

check("概念1: ADC の探索順", result1,
  ["key-file", "gcloud-user", "metadata-server", "none"],
  "全部 \"none\" なら未記入のままです。2番目が \"key-file\" になるなら " +
  "GOOGLE_APPLICATION_CREDENTIALS が undefined のときも真と判定しています(空でないかを見る)。" +
  "3番目が \"gcloud-user\" になるなら hasGcloudAdcFile の判定が抜けています。" +
  "判定は必ず 鍵ファイル → gcloud → メタデータサーバ の順に書くこと。");

export {};
