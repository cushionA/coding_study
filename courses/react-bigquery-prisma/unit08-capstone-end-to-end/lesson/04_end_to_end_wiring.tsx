/* =====================================================================
 * 概念4: 結線(wiring)— 設定・起動手順・動作確認を1本に通す
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   部品は揃いました。外部APIクライアント(unit02)、Prisma(unit03・04)、
 *   BigQuery(unit05)、Express(unit06)、React(unit07)、そして今日の
 *   デバウンス検索・二重書き込み・degrade。残っているのは、実務で
 *   いちばん軽視され、いちばん時間を溶かす工程です —— **結線** です。
 *
 *   「自分のPCでは動くのに、他の人が clone すると動かない」の原因は、
 *   ほぼ100%この工程の手抜きです:
 *     ・環境変数が足りないのに、起動時ではなく **最初のリクエストで** 落ちる
 *     ・.env に何を書けばいいのか、どこにも書いていない
 *     ・API は 3000、Vite は 5173。繋ぎ方(proxy か CORS か)が決まっていない
 *     ・DBの鍵がフロントのバンドルに混ざって公開される(取り返しがつかない)
 *   今日はこれらを、設計として片付けます。
 *
 * ■ 解説:
 *
 *   ● 設定は「起動時に1回、全部まとめて検証する」(fail fast)
 *     process.env は「string | undefined の辞書」です。型が無く、いつでも
 *     undefined になり得ます。これをアプリ中で直接読むと、
 *     `undefined/books` のような壊れたURLを叩いて初めて気づく羽目になります。
 *
 *     正しい形は、入口で1回だけ検証して **型の付いた設定オブジェクト** に変えること:
 *
 *         const ConfigSchema = z.object({ PORT: z.coerce.number().default(3000), ... });
 *         export const config = ConfigSchema.parse(process.env);  // 起動時に落ちる
 *
 *     unit02 概念2 で「外から来た JSON は zod で検証してから使う」と学びました。
 *     **環境変数も外から来たデータです**。同じ扱いをします。
 *     C# アナロジー: appsettings.json を `IOptions<MyOptions>` にバインドし、
 *     `ValidateOnStart()` を付けて起動時に検証する、あの形そのものです。
 *
 *     ★ 起動時に落ちることが価値です。「動いているが設定が壊れている」より
 *       「そもそも起動しない」方が、被害も調査時間も圧倒的に小さい。
 *
 *   ● 秘密の境界 —— どの変数がブラウザに届くのか
 *     Vite は「**VITE_ で始まる環境変数だけ** をクライアントのコードに埋め込む」
 *     という規則を持っています(`import.meta.env.VITE_API_BASE` のように読む)。
 *     DATABASE_URL や GOOGLE_APPLICATION_CREDENTIALS は VITE_ が付いていないので
 *     バンドルに入りません —— これは事故防止の柵です。
 *     逆に言えば、**VITE_ を付けた瞬間その値は全世界に公開** されます。
 *     「動かないから VITE_ を付けてみた」は最悪の事故になります。
 *     unit06 概念5 の「鍵はサーバの内側」を、ビルドツールの規則として
 *     もう一段固めたもの、と理解してください。
 *
 *   ● 開発中の2ポート問題(Vite 5173 / API 3000)
 *     ブラウザは「別オリジンへの XHR/fetch」を既定で拒みます(同一オリジンポリシー)。
 *     解決は2択:
 *       ① Vite の proxy(おすすめ)
 *            // vite.config.ts
 *            server: { proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } } }
 *          → ブラウザから見ると同一オリジン(5173)。CORS 自体が発生しない。
 *            本番(同じドメインで配信 or リバースプロキシ)と構成が揃うのも利点。
 *       ② API 側で CORS を許可する
 *            app.use(cors({ origin: "http://localhost:5173" }));
 *          → Access-Control-Allow-Origin ヘッダが付き、ブラウザが許す。
 *            origin: true(全許可)で運用しないこと。
 *     どちらでもよいのですが、**決めて README に書く** ことが結線の仕事です。
 *
 *   ● 合成ルート(composition root)
 *     「本物の依存を new して繋ぐ場所」をアプリに1箇所だけ作ります(main 関数)。
 *     それ以外の層は、受け取ったインターフェースにだけ依存します(unit06 概念4)。
 *
 *         const config = loadConfig(process.env);
 *         const prisma = new PrismaClient({ adapter });
 *         const bq     = new BigQuery({ projectId: config.BQ_PROJECT_ID });
 *         const app    = createApp({ bookRepo: createPrismaBookRepo(prisma),
 *                                    summaryRepo: createBqSummaryRepo(bq) });
 *         app.listen(config.PORT);
 *
 *     テストでは同じ createApp に偽物を渡します。**この1箇所を読めば、
 *     アプリが何に依存しているかが全部分かる** —— それが合成ルートの価値です。
 *
 *   ● 3つのプロセスと起動手順
 *       ① API サーバ    : npx tsx server/main.ts          (常駐・ポート3000)
 *       ② UI 開発サーバ : npx vite --port 5173            (常駐・HMR)
 *       ③ 取り込みジョブ: npx tsx jobs/ingest.ts          (ワンショット。本番は cron /
 *                                                          Cloud Scheduler で定期実行)
 *     ③ は常駐ではありません。「1回走って終わる」ことと、
 *     「何回走っても壊れない」(概念2の冪等性)がセットになって初めて、
 *     スケジューラに載せられます。
 *
 *   ● 動作確認シナリオ(受け入れ手順)を先に書く
 *     結線が終わったかどうかは、手順で判定します:
 *       1. .env.example をコピーして .env を作り、値を埋める
 *       2. ③ を1回流す → 「6件 upsert / 6行 insert」のログが出る
 *       3. ① を起動 → curl "http://localhost:3000/api/books?q=夏目" が 3件返す
 *       4. ② を起動 → ブラウザで「夏目」と打つ → 3件出る。
 *          開発者ツールの Network で **リクエストが1回だけ** なのを確認(概念1)
 *       5. BigQuery の権限をわざと外す → 一覧は出て、集計だけ
 *          「一時的に表示できません」になる(概念3の degrade)
 *       6. ③ をもう1回流す → Prisma の件数は変わらない(概念2の冪等性)
 *     ここまで通れば、このアプリは「他人が clone して動かせる」状態です。
 *
 *   ■ このファイルでやること:
 *     取り込み → 保存 → API → 画面 を **1プロセスの中で実際に通します**。
 *     偽物(fake)を使いますが、繋ぎ方・依存の向き・degrade の伝わり方は本物と同じです。
 * ===================================================================== */

import "./_dom.js";
import { useEffect, useState, type ReactElement } from "react";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import express from "express";
import cors from "cors";
import type { AddressInfo } from "node:net";
import { z } from "zod";
import { createFakePrisma, type PrismaLike } from "../lessonlib/fakePrisma.js";
import { createFakeSourceApi } from "../lessonlib/fakeSourceApi.js";
import {
  createAnalyticsBq, DATASET_ID, TABLE_ID,
  type BigQueryLike, type Row, type TableLike,
} from "../lessonlib/analytics.js";

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

// --- 実験用の小道具(書き換え不要) --------------------------------------
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function settle(ms = 300, step = 5): Promise<void> {
  for (let i = 0; i < Math.ceil(ms / step); i++) {
    await act(async () => { await sleep(step); });
  }
}
function mount(element: ReactElement): void { cleanup(); render(element); }
async function typeText(text: string, gapMs = 20): Promise<void> {
  const input = screen.getByRole("textbox");
  for (let i = 1; i <= text.length; i++) {
    await act(async () => {
      fireEvent.change(input, { target: { value: text.slice(0, i) } });
      await sleep(gapMs);
    });
  }
}
async function withServer(app: express.Express, fn: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「設定を検証 → 取り込みジョブ → APIサーバ → 検索画面」を1本で通し、
//       外部APIから来たデータがブラウザの画面に出るまでを目で追う。

const NOW = "2026-09-05T09:00:00Z";
const TODAY = "2026-09-05";

// ==== STEP 1: 設定 —— 起動時に1回だけ検証して、型の付いた設定に変える ====
const ConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).startsWith("file:"),   // 今回は SQLite 前提
  BQ_PROJECT_ID: z.string().min(1),
  BQ_DATASET: z.string().min(1).default("app_analytics"),
  SOURCE_API_URL: z.string().min(1).startsWith("https://"),
});
type AppConfig = z.infer<typeof ConfigSchema>;
//   ↑ z.infer<typeof Schema> は「そのスキーマを通ったデータの型」。
//     手で type を二重に書かなくて済む(unit02 概念2 で既出)。

const DEMO_ENV = {
  PORT: "3000",
  DATABASE_URL: "file:./dev.db",
  BQ_PROJECT_ID: "my-bq-study-001",
  SOURCE_API_URL: "https://example.test/books?limit=50",
  // BQ_DATASET は未設定 → default が効く
  GOOGLE_APPLICATION_CREDENTIALS: "/keys/sa.json",  // サーバだけが知ってよい値
};

function loadConfigDemo(env: Record<string, string | undefined>): AppConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))].sort();
    throw new Error(`設定エラー: ${keys.join(", ")}`);
  }
  return parsed.data;
}

const config = loadConfigDemo(DEMO_ENV);
console.log("STEP 1: 設定 =", JSON.stringify(config));
console.log("        ↑ PORT は文字列 \"3000\" から数値 3000 に、BQ_DATASET は既定値で埋まっている。");

// ==== STEP 2: 合成ルート —— 依存をここで1回だけ組み立てる ====
//   本番ではこの3行が new PrismaClient(...) / new BigQuery(...) / 本物の fetch になる。
const prisma = createFakePrisma();
const bq = createAnalyticsBq();
const sourceApi = createFakeSourceApi();

// ==== STEP 3: 取り込みジョブ(概念2の要約版)====
type DomainBook = { isbn: string; title: string; author: string; publishedYear: number | null };
const SourceSchema = z.object({
  items: z.array(z.object({
    isbn: z.string(), title: z.string(), author_name: z.string(),
    first_publish_year: z.number().int().nullable(),
  })),
});

function toAnalyticsRow(b: DomainBook, batchId: string, source: string): Row {
  return {
    event_id: `${TODAY}:${b.isbn}`, batch_id: batchId, ingested_at: NOW, event_date: TODAY,
    isbn: b.isbn, title: b.title, author: b.author, published_year: b.publishedYear, source,
  };
}

async function runIngestJob(
  cfg: AppConfig, db: PrismaLike, table: TableLike, batchId: string,
): Promise<{ upserted: number; analyticsSynced: boolean }> {
  // ① 取得 + 検証 + DTO→ドメイン変換(unit02)
  const res = await sourceApi.fetch(cfg.SOURCE_API_URL);
  if (!res.ok) throw new Error(`upstream error: HTTP ${res.status}`);
  const parsed = SourceSchema.parse(await res.json());
  const books: DomainBook[] = parsed.items.map((d) => ({
    isbn: d.isbn, title: d.title, author: d.author_name, publishedYear: d.first_publish_year,
  }));

  // ② 正(Prisma)へ。ここが失敗したらジョブ失敗(例外は投げっぱなし)
  const upserted = await db.$transaction(async (tx) => {
    await tx.ingestRun.create({ data: { id: batchId, source: cfg.SOURCE_API_URL, startedAt: NOW } });
    for (const b of books) {
      await tx.book.upsert({
        where: { isbn: b.isbn },
        update: { title: b.title, author: b.author, publishedYear: b.publishedYear, updatedAt: NOW },
        create: { ...b, updatedAt: NOW },
      });
    }
    return books.length;
  });

  // ③ 副本(BigQuery)へ。失敗しても取り込み自体は成功扱い(警告付き)
  let analyticsSynced = true;
  try {
    await table.insert(books.map((b) => toAnalyticsRow(b, batchId, "openlibrary")));
  } catch (e) {
    console.log("        [job log] 副本への書き込み失敗(再送キュー行き):", (e as Error).message);
    analyticsSynced = false;
  }
  await db.ingestRun.update({
    where: { id: batchId },
    data: { status: analyticsSynced ? "ok" : "ok_with_warning", upserted, analyticsSynced },
  });
  return { upserted, analyticsSynced };
}

// ==== STEP 4: APIサーバ(概念3の要約版)====
type BookDto = { id: number; title: string; author: string };
type AuthorCount = { author: string; count: number };
interface BookRepository { search(q: string, limit: number): Promise<BookDto[]>; }
interface SummaryRepository { topAuthors(limit: number): Promise<AuthorCount[]>; }

function createPrismaBookRepo(db: PrismaLike): BookRepository {
  return {
    async search(q, limit) {
      const rows = await db.book.findMany({
        where: q === "" ? undefined : { OR: [{ title: { contains: q } }, { author: { contains: q } }] },
        orderBy: { id: "asc" }, take: limit,
      });
      return rows.map((b) => ({ id: b.id, title: b.title, author: b.author }));
    },
  };
}
function createBqSummaryRepo(client: BigQueryLike, cfg: AppConfig): SummaryRepository {
  return {
    async topAuthors(limit) {
      const [rows] = await client.query({
        query: `SELECT author, COUNT(*) AS n FROM \`${cfg.BQ_PROJECT_ID}.${cfg.BQ_DATASET}.${TABLE_ID}\`` +
               ` GROUP BY author ORDER BY n DESC LIMIT ${limit}`,
      });
      return rows.map((r) => ({ author: String(r.author), count: Number(r.n) }));
    },
  };
}
function createApp(deps: { bookRepo: BookRepository; summaryRepo: SummaryRepository }): express.Express {
  const app = express();
  app.use(cors({ origin: "http://localhost:5173" }));   // ← 開発中の 5173 からの呼び出しを許可
  app.get("/api/books", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const [list, summary] = await Promise.allSettled([
      deps.bookRepo.search(q, 20),
      deps.summaryRepo.topAuthors(3),
    ]);
    if (list.status === "rejected") { res.status(500).json({ error: "internal_error" }); return; }
    res.json({
      q, total: list.value.length, items: list.value,
      summary: summary.status === "fulfilled" ? summary.value : null,
      degraded: summary.status === "fulfilled" ? [] : ["summary"],
    });
  });
  return app;
}

// ==== STEP 5: 画面(概念1 + unit07 概念5)====
type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; items: BookDto[]; summary: AuthorCount[] | null; degraded: string[] };

function useDebouncedValue(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function BookSearchPage({ apiBase }: { apiBase: string }) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 60);
  const [state, setState] = useState<ViewState>({ status: "idle" });

  useEffect(() => {
    if (debouncedQ === "") { setState({ status: "idle" }); return; }
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/books?q=${encodeURIComponent(debouncedQ)}`);
        if (!res.ok) { if (alive) setState({ status: "error", message: `HTTP ${res.status}` }); return; }
        const data = (await res.json()) as { items: BookDto[]; summary: AuthorCount[] | null; degraded: string[] };
        if (!alive) return;
        setState(data.items.length === 0
          ? { status: "empty" }
          : { status: "success", items: data.items, summary: data.summary, degraded: data.degraded });
      } catch (e) {
        if (alive) setState({ status: "error", message: (e as Error).message });
      }
    })();
    return () => { alive = false; };
  }, [debouncedQ, apiBase]);

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="書名か著者" />
      {state.status === "loading" && <p data-testid="status">読み込み中...</p>}
      {state.status === "idle" && <p data-testid="status">検索語を入力してください</p>}
      {state.status === "empty" && <p data-testid="status">該当する本はありません</p>}
      {state.status === "error" && <p data-testid="status" role="alert">読み込みに失敗しました: {state.message}</p>}
      {state.status === "success" && (
        <div>
          <ul>{state.items.map((b) => <li key={b.id}>{b.title}</li>)}</ul>
          {state.degraded.includes("summary")
            ? <p data-testid="summary">集計は一時的に表示できません</p>
            : <p data-testid="summary">{(state.summary ?? []).map((s) => `${s.author}:${s.count}`).join(" / ")}</p>}
        </div>
      )}
    </div>
  );
}

// ==== STEP 6: 全部つないで実際に流す ====
console.log("STEP 6: ③ 取り込みジョブを実行");
const jobResult = await runIngestJob(config, prisma, bq.dataset(config.BQ_DATASET).table(TABLE_ID), "batch-2026-09-05-001");
console.log("        →", JSON.stringify(jobResult),
  " / Prisma =", prisma.books().length, "行, BigQuery =", bq.rowsOf(TABLE_ID).length, "行");

const healthyDeps = {
  bookRepo: createPrismaBookRepo(prisma),
  summaryRepo: createBqSummaryRepo(bq, config),
};
const brokenSummaryRepo: SummaryRepository = {
  async topAuthors() { throw new Error("BigQuery: Quota exceeded"); },
};

console.log("STEP 6: ① APIサーバ起動 → ② 画面から検索(健全なケース)");
await withServer(createApp(healthyDeps), async (base) => {
  mount(<BookSearchPage apiBase={base} />);
  await typeText("夏目");
  await settle();
  console.log("        一覧 =", JSON.stringify(screen.queryAllByRole("listitem").map((li) => li.textContent)));
  console.log("        集計 =", JSON.stringify(screen.getByTestId("summary").textContent));
});

console.log("STEP 6: BigQuery だけ落ちている状態で同じ操作(degrade の伝わり方)");
await withServer(createApp({ ...healthyDeps, summaryRepo: brokenSummaryRepo }), async (base) => {
  mount(<BookSearchPage apiBase={base} />);
  await typeText("夏目");
  await settle();
  console.log("        一覧 =", JSON.stringify(screen.queryAllByRole("listitem").map((li) => li.textContent)));
  console.log("        集計 =", JSON.stringify(screen.getByTestId("summary").textContent));
});
cleanup();
console.log("        ↑ 外部API → Prisma → Express → React まで、データが1本で繋がりました。");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) DATABASE_URL を .env に書き忘れたまま起動したら、いつ・どう気づく?
//       (loadConfig で検証する場合 / process.env を直接読む場合)
//   (2) API のURLをフロントに渡したくて .env に API_BASE=http://localhost:3000 と
//       書き、React 側で import.meta.env.API_BASE を読んだ。値は何になる?
//   (3) その変数名を VITE_API_BASE に変えたら読めるようになった。
//       では VITE_DATABASE_URL と書いたらどうなる?(動く? 危険?)
//   (4) cors ミドルウェアを外すと、レスポンスヘッダから何が消える?
//       そのとき「curl は成功するのにブラウザだけ失敗する」のはなぜ?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) 検証せずに process.env を直接使うとどうなるか
const sloppyEnv: Record<string, string | undefined> = { BQ_PROJECT_ID: "my-bq-study-001" };
try {
  const url = `${sloppyEnv.SOURCE_API_URL}`;          // undefined が文字列化される
  console.log("変えてみる (1) 組み立てたURL =", JSON.stringify(url));
  await fetch(url);
} catch (e) {
  console.log("               fetch の結果 =", (e as Error).constructor.name, ":", (e as Error).message);
}
try {
  loadConfigDemo(sloppyEnv);
} catch (e) {
  console.log("               loadConfig なら起動時に =", (e as Error).message);
}

// (2) ブラウザに届く環境変数のふるい(Vite の VITE_ 規則を再現)
const rawEnv: Record<string, string> = {
  DATABASE_URL: "file:./dev.db",
  GOOGLE_APPLICATION_CREDENTIALS: "/keys/sa.json",
  VITE_API_BASE: "/api",
};
const browserEnv = Object.fromEntries(Object.entries(rawEnv).filter(([k]) => k.startsWith("VITE_")));
console.log("変えてみる (2) ブラウザのバンドルに埋まる値 =", JSON.stringify(browserEnv));
console.log("               フロントから DATABASE_URL を読むと =", JSON.stringify(browserEnv.DATABASE_URL));

// (3) CORS ヘッダの有無を実際に見る
const pingApp = (useCors: boolean) => {
  const app = express();
  if (useCors) app.use(cors({ origin: "http://localhost:5173" }));
  app.get("/api/ping", (_req, res) => { res.json({ ok: true }); });
  return app;
};
for (const useCors of [false, true]) {
  await withServer(pingApp(useCors), async (base) => {
    const res = await fetch(`${base}/api/ping`, { headers: { Origin: "http://localhost:5173" } });
    console.log(`変えてみる (3) cors=${useCors} → Access-Control-Allow-Origin =`,
      JSON.stringify(res.headers.get("access-control-allow-origin")));
  });
}
//   ※ (1) 検証しないと "undefined" という文字列のURLを叩き、実行時にようやく落ちます。
//     loadConfig なら **起動した瞬間に、足りないキー名を名指しで** 教えてくれます。
//   ※ (2) VITE_ が付いていない値はバンドルに存在しません(undefined)。
//     これは不便ではなく、鍵の流出を止める柵です。
//   ※ (3) VITE_DATABASE_URL は「読めるようになる」= **公開される**。
//     ブラウザに配ったものは秘密ではありません。DBに繋ぐのはサーバの仕事(unit06 概念5)。
//   ※ (4) cors 無しでは Access-Control-Allow-Origin ヘッダが付きません。
//     curl や Node の fetch は同一オリジンポリシーを **強制しない** ので成功します。
//     この制約はブラウザだけのもの。「curl では動くのに画面だけ動かない」の正体です。

// --- 書いてみる ---------------------------------------------------------
// 課題: 設定読み込み loadConfig を書いてください。
//   ・上で定義済みの ConfigSchema を safeParse で使う
//   ・検証に失敗したら **例外を投げる**。メッセージは
//       `設定エラー: KEY1, KEY2`
//     の形(問題のあったキーを重複なし・昇順・", " 区切りで並べる)
//   ・成功したら検証済みのデータ(parsed.data)を返す
//   ヒント(概念レベル): zod の失敗結果は parsed.error.issues という配列で、
//   各要素の path[0] に「どのキーで問題が起きたか」が入っています。
//   重複を消すには Set、並べ替えは sort() が使えます。

function loadConfig(env: Record<string, string | undefined>): AppConfig {
  // ここに書く
  void env;
  return { PORT: 0, DATABASE_URL: "", BQ_PROJECT_ID: "", BQ_DATASET: "", SOURCE_API_URL: "" }; // ← 書き換える
}

// 判定用の道具(書き換え不要)------------------------------------------------
const goodEnv = {
  PORT: "8080",
  DATABASE_URL: "file:./dev.db",
  BQ_PROJECT_ID: "my-bq-study-001",
  SOURCE_API_URL: "https://example.test/books",
  GOOGLE_APPLICATION_CREDENTIALS: "/keys/sa.json",
};
const badEnv = {
  PORT: "8080",
  DATABASE_URL: "postgres://localhost/app",   // file: で始まっていない
  SOURCE_API_URL: "https://example.test/books",
  // BQ_PROJECT_ID が無い
};

let okCase: unknown;
try {
  const c = loadConfig(goodEnv);
  okCase = {
    port: c.PORT, db: c.DATABASE_URL, project: c.BQ_PROJECT_ID,
    dataset: c.BQ_DATASET, source: c.SOURCE_API_URL,
  };
} catch (e) { okCase = `例外: ${(e as Error).message}`; }

let badCase: unknown;
try {
  loadConfig(badEnv);
  badCase = "(例外が投げられなかった)";
} catch (e) { badCase = (e as Error).message; }

const result4 = { ok: okCase, bad: badCase };

check("概念4: 起動時に設定を検証する", result4,
  {
    ok: {
      port: 8080, db: "file:./dev.db", project: "my-bq-study-001",
      dataset: "app_analytics", source: "https://example.test/books",
    },
    bad: "設定エラー: BQ_PROJECT_ID, DATABASE_URL",
  },
  "ok が port:0 / db:\"\" → まだ書いていません(仮の戻り値のまま)。" +
  "port が \"8080\"(文字列)→ ConfigSchema を通さず env をそのまま返している" +
  "(z.coerce.number() が数値に変換してくれます)。" +
  "dataset が \"\" → default(\"app_analytics\") が効く経路を通っていない。" +
  "bad が \"(例外が投げられなかった)\" → 失敗時に throw していない。" +
  "bad のメッセージが違う → 形式は `設定エラー: ` + キーを \", \" で連結。" +
  "キーは重複を消して昇順(BQ_PROJECT_ID が先、DATABASE_URL が後)。" +
  "キーが1つしか出ない → issues 全部を見ていない(1件目だけ使っていないか確認)。");

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・デバウンスで「効いている」のは setTimeout と clearTimeout のどちらか。なぜ:
 * ・このアプリで Prisma を正・BigQuery を副本にした理由を、
 *   「もし逆にしたら何が困るか」まで含めて:
 * ・2つのストアにまたがると原子性が取れない。それでも運用できるのはなぜ
 *   (冪等性・突合キー・再送キューという3語を使って):
 * ・一覧が落ちたら 500、集計が落ちたら 200+degraded と分けた判断基準:
 * ・環境変数を起動時にまとめて検証する利点を、実際に踏んだ事故を想像しながら:
 * ・このコース全体で、いちばん腑に落ちていない場所はどこか:
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */

/* =====================================================================
 * まとめ(unit08)
 * ---------------------------------------------------------------------
 * 概念                    一言で                                    C# で言うと
 * 制御コンポーネント      入力の正本は DOM ではなく state。         TwoWay バインディング +
 *                         だからプログラムから消せる・復元できる    ViewModel のプロパティ
 * デバウンス              打鍵ごとにタイマーを仕掛け直し、          打鍵ごとに CTS を作り直して
 *                         静かになったら1回だけ実行。効いているのは Task.Delay(300, token)
 *                         clearTimeout(= cleanup)の方
 * 二重書き込み            正(Prisma)→ 副本(BigQuery)の順。      分散トランザクションを
 *                         正の失敗はジョブ失敗、副本の失敗は        使わず、補償と突合で
 *                         警告付き成功                              整合させる設計
 * 冪等性                  何回流しても壊れない。upsert で行は       MERGE 文 /
 *                         増えない。BigQuery は増えるので読む側で   AddOrUpdate
 *                         event_id で潰す
 * 突合キー                batch_id を両方に持たせ、件数を突き合わせ 相関ID(CorrelationId)
 *                         られるようにする。ズレを検知できる形が命
 * degrade                 必須(一覧)と任意(集計)を分ける。      Polly のフォールバック /
 *                         allSettled で両方の決着を待ち、           Task.WhenAll ではなく
 *                         任意の失敗は degraded に記録して続行      個別に IsFaulted を見る
 * 設定の fail fast        env は外から来たデータ。起動時に zod で   IOptions +
 *                         1回検証して型付きの設定に変える           ValidateOnStart()
 * 秘密の境界              VITE_ が付いた値だけがブラウザに届く。    appsettings と
 *                         付けた瞬間それは公開情報                  ユーザーシークレットの区別
 * 合成ルート              本物の依存を new して繋ぐ場所を1箇所に。  Program.cs の
 *                         他の層はインターフェースにだけ依存        DI コンテナ登録
 *
 * ---------------------------------------------------------------------
 * コース修了 — ここまでで書けるようになったもの
 * ---------------------------------------------------------------------
 * unit01 TypeScript と非同期の足場   unit02 外部APIクライアント(検証・再試行)
 * unit03 Prisma スキーマとマイグレーション   unit04 Prisma CRUD とトランザクション
 * unit05 BigQuery(スキーマ・パラメータ化・挿入・課金)   unit06 Express の層設計
 * unit07 React の状態と副作用        unit08 それらを1本のアプリに束ねる設計判断
 *
 * 「React + BigQuery + Prisma のアプリを1人で立ち上げられる」——
 * コース開始時に立てた目標は、ここで達成です。
 *
 * ---------------------------------------------------------------------
 * 次に、実務でやること(このコースの外側)
 * ---------------------------------------------------------------------
 * 1. 実物に繋ぐ(偽物を1つずつ本物に置き換える)
 *    ・BigQuery: GCP プロジェクトを作り、サービスアカウントを1つ発行して
 *      GOOGLE_APPLICATION_CREDENTIALS を設定 → createAnalyticsBq を
 *      new BigQuery({ projectId }) に差し替える。合成ルートの1行だけが変わります。
 *      課金が怖いので、まず unit05 概念5 の dryRun で見積り、
 *      パーティション列(event_date)で WHERE を必ず付ける癖を先に付けること。
 *    ・DB: SQLite → PostgreSQL。Prisma なら provider と DATABASE_URL の変更 +
 *      マイグレーション再生成が中心(型と呼び出しコードはほぼそのまま)。
 *      ここで「本番DBに直接 db push しない」「migrate deploy を CI から」を守る。
 * 2. 運用に必要なものを足す
 *    ・構造化ログ(pino 等)+ 相関ID。今日の batch_id をログにも載せると
 *      「この取り込みで何が起きたか」を1本の線で追えます。
 *    ・監視: degraded の発生率、ingest の analyticsSynced=false の件数、
 *      突合クエリの差分。**今日レスポンスに入れた degraded は、そのまま監視項目です**。
 *    ・再送ジョブ: analyticsSynced=false の IngestRun を拾って副本に再投入する。
 * 3. 品質の土台
 *    ・CI で npx tsc --noEmit と npx vitest run を回す。
 *    ・E2E(Playwright)で「検索して結果が出る」を1本だけでも自動化する。
 *    ・.env.example と README の起動手順を、他人に clone してもらって検証する
 *      (自分のPCでしか動かないことに気づける唯一の方法です)。
 * 4. 次に学ぶと効くもの
 *    ・データ取得の定番ライブラリ(TanStack Query / SWR)。今日 useEffect で
 *      手書きしたキャッシュ・再取得・競合状態の処理が宣言的に書けます。
 *      **手で書いた経験があるからこそ、何を任せているのかが分かります。**
 *    ・型付きAPI境界(zod を共有 / tRPC / OpenAPI 生成)。
 *    ・dbt や BigQuery のスケジュールドクエリ(分析側の整形を宣言的に)。
 *
 * 次: 演習へ。lesson を見ながらで OK。
 *   ex01_search_input      … 制御コンポーネント + デバウンス検索(概念1)
 *   ex02_ingest_dual_write … 取り込みジョブと二重書き込み(概念2)
 *   ex03_search_endpoint   … 検索エンドポイントと degrade(概念3)
 *   ex04_capstone          … 全部つないだ一気通貫(概念1〜4)
 *   テストは cwd を courses/react-bigquery-prisma/ にして:
 *     npx vitest run unit08-capstone-end-to-end/tests
 * ===================================================================== */
