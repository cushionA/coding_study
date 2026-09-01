/* =====================================================================
 * 概念3: 2つのストアを1レスポンスに束ね、片方が落ちても一覧は返す(degrade)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   検索画面が欲しいのは、実は2種類のデータです。
 *
 *       ① 一覧本体   … 条件に合う本(Prisma の部分一致検索) ← 画面の主役
 *       ② サマリ     … 著者別の取り込み件数など(BigQuery の集計) ← 脇役
 *
 *   これをブラウザから2本のAPIで別々に叩く手もありますが、unit06 概念5 で見たとおり
 *   BigQuery の鍵をブラウザに置くことはできません。**集約はサーバ側の仕事** です。
 *
 *   さて、ここで実務の分かれ道です。BigQuery は「たまに遅い・たまに落ちる」
 *   サービスです(クォータ超過、認証トークンの期限切れ、単純な障害)。
 *   素直に書くと、**脇役のサマリが落ちただけで検索画面が真っ赤になります**。
 *   ユーザーが本当に必要としているのは一覧なのに。
 *   これを「主役が生きているなら、脇役が死んでも画面は出す」形に設計するのが
 *   **degrade(グレースフルデグラデーション)** です。
 *   可用性の設計で最初に覚える型で、面接でも実務レビューでも必ず問われます。
 *
 * ■ 解説:
 *
 *   ● Promise.all と Promise.allSettled の決定的な違い
 *       const [a, b] = await Promise.all([p1, p2]);
 *         … どちらか1つでも reject したら、**その瞬間に全体が reject**。
 *           成功していた方の結果は受け取れません(捨てられる)。
 *       const results = await Promise.allSettled([p1, p2]);
 *         … **全部の決着を待つ**。reject しません。戻り値は
 *             [{ status: "fulfilled", value: ... }, { status: "rejected", reason: ... }]
 *           という形の配列で、成否を1件ずつ自分で見て判断します。
 *
 *     C# アナロジー: `Task.WhenAll` は1つでも例外だと AggregateException を投げます。
 *     allSettled は「各 Task を個別に await して try/catch する」のを1行で書いたもの、
 *     あるいは `Task.WhenAll` の後で `task.IsFaulted` を1つずつ見る、に近い。
 *
 *     判別方法は unit07 概念5 の判別可能なユニオン型そのもの:
 *         if (r.status === "fulfilled") r.value   // ← この枝でだけ value が見える
 *         else                          r.reason  // ← この枝でだけ reason が見える
 *
 *   ● どちらを必須(critical)、どちらを任意(optional)と決めるか
 *     判断基準は「これが無いと、ユーザーはこの画面で用を足せないか?」です。
 *       ・一覧が無い検索画面 → 用を足せない → **必須**。落ちたらエラーを返す(500)
 *       ・サマリが無い検索画面 → 一覧は読める → **任意**。落ちたら null にして続行
 *     必須が落ちたときに 200 を返してはいけません。「成功したのに空」は
 *     ユーザーにもクライアントにも監視にも嘘をつくことになります。
 *
 *   ● 「劣化したこと」を隠さない —— degraded フィールド
 *       { items: [...], summary: null, degraded: ["summary"] }
 *     黙って null を返すと、画面は「集計が0件だった」のか「取れなかった」のかを
 *     区別できません(unit07 概念5 の「空 と エラー を混ぜるな」と同じ話)。
 *     **何が劣化しているかをレスポンスに明示** して、UI 側で
 *     「集計は一時的に表示できません」と出せるようにします。
 *     監視側もこのフィールドを数えるだけで障害率が取れます。
 *
 *   ● タイムアウトも degrade の一部
 *     「落ちている」より厄介なのが「遅い」です。BigQuery が 30 秒返さないと、
 *     検索APIも 30 秒返しません。任意のデータには必ず上限時間を付け、
 *     超えたら諦めて degraded に入れます(unit02 概念4 の AbortSignal.timeout、
 *     あるいは Promise.race でタイマーと競争させる)。
 *
 *   ● 層はどこに置くか(unit06 概念4 の復習)
 *       route      … q の検証(zod)と、HTTPステータス/JSON化だけ
 *       service    … 2つの repository を allSettled で束ね、degrade を判断する ← 今日の主役
 *       repository … Prisma / BigQuery の詳細を隠す
 *     degrade の判断は **service** に置きます。route に書くと HTTP の都合と
 *     業務の都合が混ざり、repository に書くと「自分が任意か必須か」を
 *     データ層が知ってしまう(その判断は画面の要求次第なので、層違いです)。
 *
 *   ■ このファイルで使う新しい API:
 *     ・Promise.allSettled([...]) … 全部の決着を待ち、成否を配列で返す標準API。
 *     ・r.status === "fulfilled" / "rejected" … その1件の結果の判別子。
 * ===================================================================== */

import express from "express";
import type { ErrorRequestHandler } from "express";
import type { AddressInfo } from "node:net";
import { z } from "zod";
import { createFakePrisma, type BookRecord, type PrismaLike } from "../lessonlib/fakePrisma.js";
import { createAnalyticsBq, DATASET_ID, TABLE_ID, type BigQueryLike, type Row } from "../lessonlib/analytics.js";

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

// --- 実験用の小道具(unit06 と同じ・書き換え不要) --------------------------
async function withServer(app: express.Express, fn: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}
type Hit = { status: number; body: unknown };
async function hit(url: string): Promise<Hit> {
  const res = await fetch(url);
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = `(JSONではない) ${text.slice(0, 60)}`; }
  return { status: res.status, body };
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// --- 見る(worked example) ---------------------------------------------
// GOAL: 一覧(Prisma)とサマリ(BigQuery)を1レスポンスに束ね、
//       BigQuery だけが落ちても 200 + 一覧が返ることを確認する。

const SEED_BOOKS: BookRecord[] = [
  { id: 1, isbn: "978-4-00-1", title: "吾輩は猫である", author: "夏目漱石", publishedYear: 1905, updatedAt: "2026-09-05T09:00:00Z" },
  { id: 2, isbn: "978-4-00-2", title: "坊っちゃん", author: "夏目漱石", publishedYear: 1906, updatedAt: "2026-09-05T09:00:00Z" },
  { id: 3, isbn: "978-4-00-3", title: "こころ", author: "夏目漱石", publishedYear: 1914, updatedAt: "2026-09-05T09:00:00Z" },
  { id: 4, isbn: "978-4-10-1", title: "走れメロス", author: "太宰治", publishedYear: 1940, updatedAt: "2026-09-05T09:00:00Z" },
  { id: 5, isbn: "978-4-10-2", title: "人間失格", author: "太宰治", publishedYear: 1948, updatedAt: "2026-09-05T09:00:00Z" },
  { id: 6, isbn: "978-4-12-1", title: "羅生門", author: "芥川龍之介", publishedYear: 1915, updatedAt: "2026-09-05T09:00:00Z" },
];
const SEED_EVENTS: Row[] = SEED_BOOKS.map((b) => ({
  event_id: `2026-09-05:${b.isbn}`, batch_id: "batch-2026-09-05-001",
  ingested_at: "2026-09-05T09:00:00Z", event_date: "2026-09-05",
  isbn: b.isbn, title: b.title, author: b.author, published_year: b.publishedYear, source: "openlibrary",
}));

// ==== ドメインの型(全層が共有する「アプリの言葉」) ====
type BookDto = { id: number; title: string; author: string };
type AuthorCount = { author: string; count: number };

// ==== 層3: repository —— データストアの詳細をここに閉じ込める ====
interface BookRepository { search(q: string, limit: number): Promise<BookDto[]>; }
interface SummaryRepository { topAuthors(limit: number): Promise<AuthorCount[]>; }

function createPrismaBookRepo(prisma: PrismaLike): BookRepository {
  return {
    async search(q, limit) {
      // 本番の Prisma でもこの呼び方のまま(unit04 概念2 の contains 検索)
      const rows = await prisma.book.findMany({
        where: q === "" ? undefined : { OR: [{ title: { contains: q } }, { author: { contains: q } }] },
        orderBy: { id: "asc" },
        take: limit,
      });
      return rows.map((b) => ({ id: b.id, title: b.title, author: b.author }));
    },
  };
}
function createBqSummaryRepo(bq: BigQueryLike): SummaryRepository {
  return {
    async topAuthors(limit) {
      // unit05 概念3 のパラメータ化クエリ + GROUP BY 集計
      const [rows] = await bq.query({
        query: `SELECT author, COUNT(*) AS n FROM \`my-bq-study-001.${DATASET_ID}.${TABLE_ID}\`` +
               ` GROUP BY author ORDER BY n DESC LIMIT ${limit}`,
      });
      return rows.map((r) => ({ author: String(r.author), count: Number(r.n) }));
    },
  };
}

// ==== 層2: service —— degrade の判断はここに置く ====
type SearchResponse = {
  q: string;
  total: number;
  items: BookDto[];
  summary: AuthorCount[] | null;   // 取れなければ null
  degraded: string[];              // 劣化した部分の名前(空配列なら健全)
};
type Deps = { bookRepo: BookRepository; summaryRepo: SummaryRepository };

function createSearchService(deps: Deps) {
  return {
    async search(q: string, limit: number): Promise<SearchResponse> {
      // ★ 2つを同時に投げる(直列に await すると遅い方の分だけ待たされる)
      const [listResult, summaryResult] = await Promise.allSettled([
        deps.bookRepo.search(q, limit),
        deps.summaryRepo.topAuthors(3),
      ]);

      // 必須: 一覧が取れなければ、この画面は成立しない → 例外を投げる
      if (listResult.status === "rejected") throw listResult.reason;
      const items = listResult.value;

      // 任意: サマリは落ちても続行。ただし「落ちたこと」は隠さない
      const degraded: string[] = [];
      let summary: AuthorCount[] | null = null;
      if (summaryResult.status === "fulfilled") {
        summary = summaryResult.value;
      } else {
        console.log("  [server log] サマリ取得に失敗(degrade):", (summaryResult.reason as Error).message);
        degraded.push("summary");
      }
      return { q, total: items.length, items, summary, degraded };
    },
  };
}
type SearchService = ReturnType<typeof createSearchService>;

// ==== 層1: route —— HTTP との変換だけ ====
const QuerySchema = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.log("  [server log] 想定外:", (err as Error).message);
  res.status(500).json({ error: "internal_error" });   // 詳細は外に出さない(unit06 概念3・5)
};
function createApp(service: SearchService): express.Express {
  const app = express();
  app.get("/api/books", async (req, res, next) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: "invalid_query" }); return; }
    try {
      res.json(await service.search(parsed.data.q, parsed.data.limit));
    } catch (e) { next(e); }   // 非同期の例外は next() で渡す(Express 5 なら省略可)
  });
  app.use(errorHandler);
  return app;
}

// STEP 1: 健全な状態
const prisma = createFakePrisma({ books: SEED_BOOKS });
const bq = createAnalyticsBq(SEED_EVENTS);
const healthyDeps: Deps = {
  bookRepo: createPrismaBookRepo(prisma),
  summaryRepo: createBqSummaryRepo(bq),
};
await withServer(createApp(createSearchService(healthyDeps)), async (base) => {
  const r = await hit(`${base}/api/books?q=夏目`);
  console.log("STEP 1: 健全  status =", r.status);
  console.log("        body =", JSON.stringify(r.body));
});

// STEP 2: BigQuery だけが落ちている(認証切れ・クォータ超過・障害)
const brokenSummaryRepo: SummaryRepository = {
  async topAuthors() { throw new Error("BigQuery: Quota exceeded for project my-bq-study-001"); },
};
await withServer(createApp(createSearchService({ ...healthyDeps, summaryRepo: brokenSummaryRepo })), async (base) => {
  const r = await hit(`${base}/api/books?q=夏目`);
  console.log("STEP 2: BQ障害 status =", r.status);
  console.log("        body =", JSON.stringify(r.body));
});
console.log("        ↑ 200 で一覧は返り、summary は null、degraded に \"summary\"。");
console.log("        画面は一覧を出しつつ『集計は一時的に表示できません』と伝えられる。");

// STEP 3: 逆に、必須の Prisma が落ちている
const brokenPrisma = createFakePrisma({ books: SEED_BOOKS });
brokenPrisma.failOn("book.findMany", "SQLITE_BUSY: database is locked");
await withServer(createApp(createSearchService({ ...healthyDeps, bookRepo: createPrismaBookRepo(brokenPrisma) })), async (base) => {
  const r = await hit(`${base}/api/books?q=夏目`);
  console.log("STEP 3: DB障害 status =", r.status, " body =", JSON.stringify(r.body));
});
console.log("        ↑ こちらは 500。主役が居ないのに 200 を返すのは嘘になる。");
console.log("        レスポンスに SQLITE_BUSY やDB名が漏れていないことも確認(unit06 概念5)。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) allSettled を Promise.all に変えたら、BigQuery 障害時の
//       HTTPステータスは? 一覧(取得には成功していた)は返る?
//   (2) 一覧に 50ms、サマリに 50ms かかるとき、
//       並列(allSettled)と直列(2回 await)で、応答時間はどれくらい違う?
//   (3) サマリだけが 5 秒かかる(落ちてはいない)とき、
//       degrade の設計だけで検索APIは速く返せる? 何が足りない?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) Promise.all 版(degrade しない実装)
async function searchWithAll(deps: Deps, q: string): Promise<SearchResponse> {
  const [items, summary] = await Promise.all([deps.bookRepo.search(q, 20), deps.summaryRepo.topAuthors(3)]);
  return { q, total: items.length, items, summary, degraded: [] };
}
const allApp = express();
allApp.get("/api/books", async (req, res, next) => {
  try {
    res.json(await searchWithAll({ ...healthyDeps, summaryRepo: brokenSummaryRepo }, String(req.query.q ?? "")));
  } catch (e) { next(e); }
});
allApp.use(errorHandler);
await withServer(allApp, async (base) => {
  const r = await hit(`${base}/api/books?q=夏目`);
  console.log("変えてみる (1) Promise.all + BQ障害:", r.status, JSON.stringify(r.body));
});

// (2) 並列と直列の所要時間(それぞれ 50ms かかる repository で計測)
const slowDeps: Deps = {
  bookRepo: { async search(q, limit) { await sleep(50); return healthyDeps.bookRepo.search(q, limit); } },
  summaryRepo: { async topAuthors(limit) { await sleep(50); return healthyDeps.summaryRepo.topAuthors(limit); } },
};
const t0 = Date.now();
await Promise.allSettled([slowDeps.bookRepo.search("夏目", 20), slowDeps.summaryRepo.topAuthors(3)]);
const parallelMs = Date.now() - t0;
const t1 = Date.now();
await slowDeps.bookRepo.search("夏目", 20);
await slowDeps.summaryRepo.topAuthors(3);
const serialMs = Date.now() - t1;
console.log(`変えてみる (2) 並列 = 約${parallelMs}ms / 直列 = 約${serialMs}ms`);
//   ※ (1) 500 です。一覧は取れていたのに、脇役の失敗で全部が消えました。
//     Promise.all は「両方揃わないと意味が無い」ときにだけ使う道具です。
//   ※ (2) 並列は「遅い方の時間」、直列は「合計」。unit01 概念4 でやった
//     Promise.all の効果はそのまま allSettled にもあります。
//   ※ (3) degrade だけでは足りません。落ちてはいない(いずれ返ってくる)ので、
//     こちらから見切りをつける仕掛け —— タイムアウト —— が要ります。
//     AbortSignal.timeout(unit02 概念4)か、Promise.race でタイマーと競争させ、
//     時間切れを「rejected」として degrade に落とすのが定石です。

// --- 書いてみる ---------------------------------------------------------
// 課題: service 層の関数 searchWithSummary を書いてください。
//   ・deps.bookRepo.search(q, 20) と deps.summaryRepo.topAuthors(3) を **同時に** 投げる
//   ・一覧が失敗したら、その例外をそのまま外に投げる(この画面は成立しないため)
//   ・サマリが失敗したら summary は null、degraded に "summary" を追加して続行
//   ・戻り値は { items, summary, degraded } の3つ(この順・この名前)
//   ヒント(概念レベル): Promise.allSettled の各要素は status で判別する
//   ユニオン型です。fulfilled の枝でだけ value が、rejected の枝でだけ reason が見えます。
type SearchLite = { items: BookDto[]; summary: AuthorCount[] | null; degraded: string[] };

async function searchWithSummary(deps: Deps, q: string): Promise<SearchLite> {
  // ここに書く
  void deps; void q;
  return { items: [], summary: null, degraded: ["未実装"] };   // ← 書き換える
}

// 判定用の道具(書き換え不要)------------------------------------------------
async function runCase(deps: Deps): Promise<unknown> {
  try {
    const r = await searchWithSummary(deps, "夏目");
    return { items: r.items.map((b) => b.title), summary: r.summary, degraded: r.degraded };
  } catch (e) {
    return `例外: ${(e as Error).message}`;
  }
}
const caseHealthy = await runCase(healthyDeps);
const caseBqDown = await runCase({ ...healthyDeps, summaryRepo: brokenSummaryRepo });
const caseDbDown = await runCase({ ...healthyDeps, bookRepo: createPrismaBookRepo(brokenPrisma) });

const result3 = { healthy: caseHealthy, bqDown: caseBqDown, dbDown: caseDbDown };

check("概念3: 片方が落ちても一覧は返す", result3,
  {
    healthy: {
      items: ["吾輩は猫である", "坊っちゃん", "こころ"],
      summary: [{ author: "夏目漱石", count: 3 }, { author: "太宰治", count: 2 }, { author: "芥川龍之介", count: 1 }],
      degraded: [],
    },
    bqDown: {
      items: ["吾輩は猫である", "坊っちゃん", "こころ"],
      summary: null,
      degraded: ["summary"],
    },
    dbDown: "例外: SQLITE_BUSY: database is locked",
  },
  "degraded が [\"未実装\"] のまま → まだ書いていません。" +
  "bqDown が \"例外: BigQuery: Quota exceeded...\" → サマリの失敗を捕まえていない" +
  "(allSettled ではなく all を使っているか、rejected の枝を書いていない)。" +
  "dbDown が例外にならず items:[] になる → 一覧の失敗まで握りつぶしています" +
  "(必須と任意の扱いを分けてください)。" +
  "healthy の summary が null → fulfilled の枝で value を取り出せていない。" +
  "summary の中身が [{author,n}] → repository の戻り値は { author, count } です(そのまま返す)。" +
  "items が6件 → q を bookRepo.search に渡していない。");

export {};
