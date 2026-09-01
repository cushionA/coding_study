/* =====================================================================
 * 概念2: 二重書き込み(dual write)— 正はどっちか、部分失敗をどう扱うか
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   実務の取り込みジョブは、たいてい「1回取ってきて2箇所に書く」形になります。
 *
 *       外部API(unit02) ──▶ アプリDB / Prisma(unit03・04)   ← 画面が読む「正」
 *                        └─▶ BigQuery(unit05)               ← 分析が読む「副本」
 *
 *   なぜ2箇所か。Prisma(RDB)は「1件を正確に読み書きする」のが得意で、
 *   BigQuery は「何億行を横断して集計する」のが得意だからです(unit05 の対比表)。
 *   1つで両方をやらせようとすると、どちらかが必ず苦しくなります。
 *
 *   そして、ここからが本題です。**2つのストアにまたがるとトランザクションが
 *   使えません**。unit04 の $transaction は1つのDBの中でしか効きません。
 *   BigQuery に送った行は「やっぱり無かったことに」できません。
 *   つまり「DBには入ったが BigQuery には入っていない」「BigQuery には入ったが
 *   DBがロールバックされた」という **不整合が原理的に起こり得ます**。
 *
 *   ここで「頑張って原子性を保つ」方向に走ると、2フェーズコミットや Saga の
 *   世界に入り込んで手に負えなくなります。実務の 9 割はそうではなく、
 *   **「どちらを正とするか」を決めて、ズレを検知・修復できるようにする** という
 *   割り切りで解決します。今日はその割り切りを設計として言語化し、コードにします。
 *
 * ■ 解説:
 *
 *   ● 決めごと① 正(source of truth)はどっちか
 *     このアプリでは **Prisma を正**、BigQuery を副本にします。理由:
 *       ・画面の一覧・詳細は Prisma を読む(ユーザーが見るのはこっち)
 *       ・BigQuery は集計用。多少遅れても、少々重複していても、集計時に吸収できる
 *       ・逆(BigQuery を正)にすると、1件更新のたびに数秒〜数分の反映待ちが発生し、
 *         一意制約も外部キーも無いので「本当に1件か」を保証できない
 *     → **正への書き込みが失敗したら、ジョブは失敗**。
 *       **副本への書き込みが失敗しても、ジョブは成功扱い(警告付き)**。
 *     この非対称性が設計の核心です。「両方成功しないと失敗」にすると、
 *     BigQuery が数分落ちただけで取り込みが止まり、画面のデータが古くなります。
 *     ユーザーへの影響が大きいのはどちらか、で決めます。
 *
 *   ● 決めごと② 何度流しても同じ結果になること(冪等性 idempotency)
 *     ジョブは必ず再実行されます(失敗のリトライ、手動での流し直し、
 *     スケジューラの二重起動)。だから「2回流しても壊れない」ことが前提条件です。
 *       ・Prisma 側: **upsert**(unit04 概念3)。isbn のような自然キーで
 *         「あれば更新・無ければ作成」。何度流しても行数は増えません。
 *       ・BigQuery 側: 追記専用で一意制約が無いので、**素直に2倍になります**
 *         (unit05 概念4)。ここは「書く側で防ぐ」のを諦め、
 *         **読む側で潰す**(event_id で GROUP BY / DISTINCT)のが定石です。
 *     C# アナロジー: EF Core の Attach + 主キー一致で Update/Insert を切り替える
 *     のが upsert、BigQuery は「追記専用の監査ログテーブル」に近いと思ってください。
 *
 *   ● 決めごと③ 突合キー(reconciliation key)を両方に持たせる
 *     取り込み1回ごとに **バッチID** を作り、Prisma の IngestRun.id と
 *     BigQuery の batch_id の **両方に同じ値** を入れます。すると後から
 *
 *         Prisma:   SELECT upserted FROM IngestRun WHERE id = 'batch-...'
 *         BigQuery: SELECT COUNT(*) FROM ... WHERE batch_id = 'batch-...'
 *
 *     を突き合わせるだけで「このバッチはズレているか」が分かります。
 *     さらに行ごとの event_id(= バッチID + ISBN)を入れておけば、
 *     重複排除も再送も行単位でできます。
 *     **突合できない不整合が、いちばん高くつく不整合です。**
 *
 *   ● 決めごと④ 部分失敗の行き先(再送キュー)
 *     副本の書き込みに失敗したら、握りつぶさずに
 *       ・IngestRun.analyticsSynced = false で **記録に残す**
 *       ・ログに batchId と理由を出す
 *       ・後から「analyticsSynced が false の行」を拾って再送する
 *     この「あとで拾える形にしておく」ことが再送キューの最小実装です。
 *     何もしないと「なぜか特定の日の集計だけ少ない」という、原因究明に
 *     数日かかる類のバグになります。
 *
 *   ● 書く順番にも意味がある
 *     必ず **正 → 副本** の順です。逆にすると、副本にあってDBに無い行
 *     (= 画面に出ないのに集計には出る幽霊)が生まれます。
 *     「正が先、副本は後、失敗したら記録して次へ」と覚えてください。
 *
 *   ■ このファイルで使う道具(既習):
 *     ・zod の safeParse(unit02 概念2)… 外から来た JSON を信用しないための検証
 *     ・prisma.book.upsert / $transaction(unit04 概念3・4)
 *     ・table.insert(rows)(unit05 概念4)… 部分失敗は PartialFailureError
 *     ・bq.query({ query, params })(unit05 概念3)… 突合クエリ
 * ===================================================================== */

import { z } from "zod";
import { createFakePrisma, type PrismaLike } from "../lessonlib/fakePrisma.js";
import { createFakeSourceApi, type FetchLike } from "../lessonlib/fakeSourceApi.js";
import { createAnalyticsBq, DATASET_ID, TABLE_ID, type Row, type TableLike } from "../lessonlib/analytics.js";

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
// GOAL: 「取得 → 検証 → 正(Prisma)へ upsert → 副本(BigQuery)へ insert」を
//       通しで書き、同じジョブを2回流したときの両者の振る舞いの違いを目で見る。

const NOW = "2026-09-05T09:00:00Z";   // 実行時刻を固定(結果を毎回同じにするため)
const TODAY = "2026-09-05";
const SOURCE = "openlibrary";

/** アプリ内部で使うドメイン型(camelCase)。外部APIの DTO とは別物。 */
type DomainBook = { isbn: string; title: string; author: string; publishedYear: number | null };

// STEP 1: 取得 + 検証 + DTO→ドメイン変換(unit02 でやったことの再演)
const SourceListSchema = z.object({
  items: z.array(z.object({
    isbn: z.string().min(1),
    title: z.string().min(1),
    author_name: z.string().min(1),
    first_publish_year: z.number().int().nullable(),
  })),
});

async function fetchBooksFromSource(doFetch: FetchLike, url: string): Promise<DomainBook[]> {
  const res = await doFetch(url);
  if (!res.ok) throw new Error(`upstream error: HTTP ${res.status}`); // 4xx/5xx は例外にならない(unit01)
  const parsed = SourceListSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error(`upstream schema mismatch: ${parsed.error.issues[0]?.message}`);
  return parsed.data.items.map((d) => ({
    isbn: d.isbn,
    title: d.title,
    author: d.author_name,             // ← snake_case → camelCase の変換はここ1箇所だけ
    publishedYear: d.first_publish_year,
  }));
}

// STEP 2: 正(Prisma)へ。IngestRun を1件立ててから upsert を並べる。
//         ここは1つのDBの中の話なので $transaction が効く(unit04 概念4)。
async function saveToPrimary(
  prisma: PrismaLike, books: DomainBook[], batchId: string, source: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.ingestRun.create({ data: { id: batchId, source, startedAt: NOW, status: "running" } });
    for (const b of books) {
      await tx.book.upsert({
        where: { isbn: b.isbn },                                   // ← 自然キーで同一性を判断
        update: { title: b.title, author: b.author, publishedYear: b.publishedYear, updatedAt: NOW },
        create: { ...b, updatedAt: NOW },
      });
    }
    return books.length;
  });
}

// STEP 3: 副本(BigQuery)へ。1冊 = 1イベント行。突合キーを必ず載せる。
function toAnalyticsRow(b: DomainBook, batchId: string, source: string): Row {
  return {
    // 行の同一性。★ バッチIDではなく「日付 + ISBN」で決めるのがコツ。
    //   バッチIDを混ぜると、再実行のたびに別のIDになり、重複排除に使えなくなります。
    //   「その日その本を見た」という **事実** に対して1つのIDを与えます。
    event_id: `${TODAY}:${b.isbn}`,
    batch_id: batchId,                  // ★ Prisma の IngestRun.id と同じ値 = 突合キー
    ingested_at: NOW,
    event_date: TODAY,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
    published_year: b.publishedYear,
    source,
  };
}
async function saveToAnalytics(
  table: TableLike, books: DomainBook[], batchId: string, source: string,
): Promise<number> {
  const rows = books.map((b) => toAnalyticsRow(b, batchId, source));
  await table.insert(rows);   // 部分失敗なら PartialFailureError で reject(unit05 概念4)
  return rows.length;
}

// STEP 4: 1回目の取り込みを通しで流す
const source = createFakeSourceApi();
const prisma = createFakePrisma();
const bq = createAnalyticsBq();
const analyticsTable = bq.dataset(DATASET_ID).table(TABLE_ID);

const books = await fetchBooksFromSource(source.fetch, "https://example.test/books?limit=50");
console.log("STEP 4: 取得 =", books.length, "件 / 先頭 =", JSON.stringify(books[0]));

const batch1 = "batch-2026-09-05-001";
const upserted1 = await saveToPrimary(prisma, books, batch1, SOURCE);
const inserted1 = await saveToAnalytics(analyticsTable, books, batch1, SOURCE);
await prisma.ingestRun.update({
  where: { id: batch1 },
  data: { status: "ok", upserted: upserted1, analyticsSynced: true },
});
console.log("STEP 4: 1回目 → Prisma =", prisma.books().length, "行 / BigQuery =", bq.rowsOf(TABLE_ID).length, "行",
  `(upserted=${upserted1}, inserted=${inserted1})`);

// STEP 5: まったく同じジョブをもう1回流す(スケジューラの二重起動を再現)
const batch2 = "batch-2026-09-05-002";
const upserted2 = await saveToPrimary(prisma, books, batch2, SOURCE);
await saveToAnalytics(analyticsTable, books, batch2, SOURCE);
await prisma.ingestRun.update({
  where: { id: batch2 },
  data: { status: "ok", upserted: upserted2, analyticsSynced: true },
});
console.log("STEP 5: 2回目 → Prisma =", prisma.books().length, "行 / BigQuery =", bq.rowsOf(TABLE_ID).length, "行");
console.log("        ↑ Prisma は upsert なので増えない。BigQuery は追記専用なので倍になる。");
console.log("        これは事故ではなく仕様。だから『読むときに潰す』設計にしておく。");

// STEP 6: 突合(reconcile)— バッチIDで両者を突き合わせる
const [byBatch] = await bq.query({
  query: `SELECT COUNT(*) AS n FROM \`my-bq-study-001.${DATASET_ID}.${TABLE_ID}\` WHERE batch_id = @batchId`,
  params: { batchId: batch1 },
});
const run1 = (await prisma.ingestRun.findMany()).find((r) => r.id === batch1);
console.log("STEP 6: 突合  Prisma.IngestRun.upserted =", run1?.upserted,
  " / BigQuery(batch_id 一致) =", byBatch[0]?.n);
console.log("        ↑ この2つが一致していれば、そのバッチは健全。ズレていたら再送対象。");

// STEP 7: 重複を「読むときに」潰す
const [distinct] = await bq.query({
  query: `SELECT event_id, COUNT(*) AS n FROM \`my-bq-study-001.${DATASET_ID}.${TABLE_ID}\` GROUP BY event_id`,
});
console.log("STEP 7: 全行数 =", bq.rowsOf(TABLE_ID).length, " / event_id の種類数 =", distinct.length);
console.log("        ↑ 行は12でも、実体は6種類。GROUP BY event_id で集計すれば重複は消える。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) BigQuery への insert を **prisma.$transaction の中** に入れて、
//       その直後にDB側で例外を起こしたら —— DBの行は巻き戻る? BigQuery の行は?
//   (2) (1) の状態でジョブを再実行したら、BigQuery の行数はどうなる?
//       そのときDBには何行ある?
//   (3) 「副本の失敗もジョブ失敗にする」方針にして、BigQuery が5分間落ちて
//       いる間に1分おきにリトライしたら、復旧後の BigQuery には何が起きている?
//   (4) 上の STEP 6 の突合クエリで、Prisma=6・BigQuery=0 だったとしたら、
//       どこで何が起きた可能性がある?(復旧手順も考えてみてください)
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1)(2) BigQuery への書き込みをトランザクションの中に入れてみる
const prismaX = createFakePrisma();
const bqX = createAnalyticsBq();
const tableX = bqX.dataset(DATASET_ID).table(TABLE_ID);

async function badDualWrite(batchId: string): Promise<void> {
  await prismaX.$transaction(async (tx) => {
    await tx.ingestRun.create({ data: { id: batchId, source: SOURCE, startedAt: NOW } });
    for (const b of books) {
      await tx.book.upsert({
        where: { isbn: b.isbn },
        update: { title: b.title, author: b.author, publishedYear: b.publishedYear, updatedAt: NOW },
        create: { ...b, updatedAt: NOW },
      });
    }
    // ★ 外部サービスへの書き込みをトランザクションの中でやってしまう
    await tableX.insert(books.map((b) => toAnalyticsRow(b, batchId, SOURCE)));
    // このあとDB側で何か失敗した、とする(一意制約違反・タイムアウト等)
    throw new Error("DB error: connection lost");
  });
}
for (const id of ["batch-x-001", "batch-x-002"]) {
  try { await badDualWrite(id); } catch (e) { console.log(`変えてみる: ${id} 失敗 =`, (e as Error).message); }
  console.log(`      → Prisma = ${prismaX.books().length} 行 / BigQuery = ${bqX.rowsOf(TABLE_ID).length} 行`);
}

// (3) 副本の失敗をジョブ失敗として扱い、リトライを繰り返した場合
const bqY = createAnalyticsBq();
const tableY = bqY.dataset(DATASET_ID).table(TABLE_ID);
let attempts = 0;
for (const id of ["batch-y-001", "batch-y-002", "batch-y-003"]) {
  attempts++;
  await tableY.insert(books.map((b) => toAnalyticsRow(b, id, SOURCE)));  // 送信は成功している
  // …が、この直後の「ジョブ全体の後処理」が失敗して、ジョブは失敗扱い → 再実行される、とする
}
console.log(`変えてみる (3): ${attempts} 回リトライ後の BigQuery 行数 =`, bqY.rowsOf(TABLE_ID).length);
//   ※ (1) DBは巻き戻りますが、**BigQuery の行は残ります**。送信済みのHTTPリクエストは
//     取り消せません。「トランザクションの中で外部サービスを呼ばない」は鉄則です
//     (メール送信・決済・Webhook も同じ。ロールバックで送信済みメールは消せません)。
//   ※ (2) 再実行するたびに BigQuery だけが増え続け、DBは0行のまま。
//     これが「副本にあって正に無い幽霊行」。突合クエリで初めて気づけます。
//   ※ (3) 3回ぶんの行がすべて残ります(batch_id は違うので、どれが本物か
//     読む側では判断できません)。「副本の失敗でジョブ全体を失敗にする」方針が
//     かえって不整合を増やす、という逆説がここにあります。
//   ※ (4) Prisma=6 / BigQuery=0 は「正には書けたが副本に届かなかった」状態。
//     analyticsSynced=false のはずなので、そのバッチの本だけを再送すれば直ります。
//     復旧できるのは batch_id を両方に入れておいたおかげです。

// --- 書いてみる ---------------------------------------------------------
// 課題: 取り込みジョブ本体 runIngest を書いてください。
//   使う部品は上で定義済みの saveToPrimary / saveToAnalytics です(中身は書かなくてよい)。
//   手順と方針:
//     1. deps.fetchBooks() で本の一覧を取る
//     2. 正(Prisma)へ保存する。**ここが失敗したらジョブは失敗** ——
//        例外は握りつぶさず、そのまま外に投げる(呼び出し元が失敗を知る必要がある)
//     3. 副本(BigQuery)へ保存する。**ここが失敗してもジョブは成功扱い** ——
//        例外を捕まえて、analyticsSynced=false / warning="analytics_failed" にする
//     4. IngestRun を更新して結果を記録する(prisma.ingestRun.update):
//        status(下記)/ upserted(件数)/ analyticsSynced
//     5. { status, upserted, analyticsSynced, warning } を返す
//        status は 副本も成功なら "ok"、副本だけ失敗なら "ok_with_warning"
//        warning は 成功時 null、失敗時 "analytics_failed"
//   ヒント(概念レベル): try/catch を「副本の書き込みだけ」に掛けるのがコツです。
//   広く掛けると、正の失敗まで握りつぶしてしまいます。
type IngestDeps = {
  prisma: PrismaLike;
  table: TableLike;
  fetchBooks: () => Promise<DomainBook[]>;
  batchId: string;
  source: string;
};
type IngestResult = {
  status: "ok" | "ok_with_warning";
  upserted: number;
  analyticsSynced: boolean;
  warning: string | null;
};

async function runIngest(deps: IngestDeps): Promise<IngestResult> {
  // ここに書く
  void deps;
  return { status: "ok", upserted: 0, analyticsSynced: false, warning: "未実装" }; // ← 書き換える
}

// 判定用の道具(書き換え不要)------------------------------------------------
const brokenTable: TableLike = {
  id: TABLE_ID,
  async insert() { throw new Error("BigQuery: 503 backend error"); },
};
function freshDeps(over: Partial<IngestDeps> = {}): IngestDeps {
  const p = createFakePrisma();
  const b = createAnalyticsBq();
  return {
    prisma: p,
    table: b.dataset(DATASET_ID).table(TABLE_ID),
    fetchBooks: async () => books,
    batchId: "batch-check-001",
    source: SOURCE,
    ...over,
  };
}
async function runScenario(deps: IngestDeps): Promise<unknown> {
  try {
    const r = await runIngest(deps);
    return { status: r.status, upserted: r.upserted, analyticsSynced: r.analyticsSynced, warning: r.warning };
  } catch (e) {
    return `例外: ${(e as Error).message}`;
  }
}

// シナリオA: 全部健全
const depsA = freshDeps();
const resultA = await runScenario(depsA);

// シナリオB: BigQuery だけ落ちている
const depsB = freshDeps({ table: brokenTable });
const resultB = await runScenario(depsB);
const runsB = await depsB.prisma.ingestRun.findMany();
const recordB = runsB.length === 0
  ? "(IngestRun が作られていない)"
  : { status: runsB[0]!.status, upserted: runsB[0]!.upserted, analyticsSynced: runsB[0]!.analyticsSynced };

// シナリオC: DB(正)が落ちている
const prismaC = createFakePrisma();
prismaC.failOn("book.upsert", "SQLITE_BUSY: database is locked");
const resultC = await runScenario(freshDeps({ prisma: prismaC }));

const result2 = { A: resultA, B: resultB, Brecord: recordB, C: resultC };

check("概念2: 二重書き込みと degrade 方針", result2,
  {
    A: { status: "ok", upserted: 6, analyticsSynced: true, warning: null },
    B: { status: "ok_with_warning", upserted: 6, analyticsSynced: false, warning: "analytics_failed" },
    Brecord: { status: "ok_with_warning", upserted: 6, analyticsSynced: false },
    C: "例外: SQLITE_BUSY: database is locked",
  },
  "全部 warning:\"未実装\" → まだ書いていません。" +
  "A の upserted が 0 → saveToPrimary の戻り値(件数)を使っていない。" +
  "B が例外になる → 副本の失敗を捕まえていない(try/catch が副本に掛かっていない)。" +
  "C が例外にならない → try/catch が広すぎて、正の失敗まで握りつぶしている。" +
  "Brecord が \"(IngestRun が作られていない)\" → saveToPrimary を呼んでいない。" +
  "Brecord の status が \"running\" のまま → 最後の ingestRun.update を忘れている" +
  "(再送キューはこの列を見て拾うので、ここが更新されないと復旧できません)。");

export {};
