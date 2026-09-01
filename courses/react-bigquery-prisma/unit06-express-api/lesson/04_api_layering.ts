/* =====================================================================
 * 概念4: route → service → repository の層分離
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここまでで作ったルートは、中身が「データ取得」だけだったので短く済みました。
 *   しかし本番の /api/books/1 は、最終的にこうなります:
 *
 *     ・Prisma でアプリDBから本を1件取る            (unit04)
 *     ・BigQuery から その本の貸出集計を取る        (unit05)
 *     ・2つを1つのJSONに合体して返す
 *     ・本が無ければ 404、BigQuery が落ちていたら…?
 *
 *   これを app.get(...) の中に全部書くと、次の3つが同時に壊れます:
 *     ① テストできない。ハンドラを1回動かすのにDBとGCP認証が要る
 *     ② 再利用できない。同じ集計を「CSV出力」でも使いたくなったとき、
 *       HTTPのハンドラの中にロジックがあると呼べない
 *     ③ 読めない。HTTPの都合(ステータスコード)と業務の都合(貸出集計)が
 *       同じ関数に同居する
 *
 *   だから層に切ります。C# の実務でおなじみの Controller / Service / Repository
 *   そのままです。ASP.NET Core を書いたことがあるなら、今日の内容は
 *   「同じ設計を、DIコンテナ無しの世界でどう実現するか」の話になります。
 *
 * ■ 解説:
 *
 *   ● 3つの層と、それぞれが「知ってよいこと」
 *
 *       route      … HTTP ↔ 値の変換だけ。req から取り出し、検証し、service を呼び、
 *                    status と JSON を決める。**HTTPを知っているのはこの層だけ**
 *                    C#: Controller / MapGet のラムダ
 *       service    … ユースケース。複数の repository を束ね、業務ルールを適用する。
 *                    **req も res も知らない**(HTTP以外から呼べる)
 *                    C#: BookService
 *       repository … データストアの詳細(Prisma のクエリ、BigQuery のSQL、外部API)を隠す。
 *                    引数と戻り値は **ドメインの型** だけ。
 *                    C#: IBookRepository + EfBookRepository
 *
 *     依存の向きは必ず route → service → repository の一方通行。
 *     逆向き(repository が res を触る、service が req を受け取る)が現れたら設計が崩れています。
 *
 *   ● 「インターフェースで受けて、実装は外から渡す」
 *     service は「BookRepository という **形** を持つ何か」に依存します。
 *     それが Prisma 実装なのか、テスト用の偽物なのかは知りません。
 *
 *       interface BookRepository { findById(id: number): Promise<Book | null>; }
 *
 *     TypeScript の interface は C# の interface とほぼ同じ意味です。ただし
 *     **implements を書かなくても、形が合っていれば代入できます**(構造的部分型)。
 *     C# は「その interface を実装すると宣言したクラス」しか代入できない(名前的部分型)
 *     ので、ここは考え方が違うところ。テスト用の偽物をオブジェクトリテラルで
 *     その場で書けるのは、この性質のおかげです。
 *
 *   ● DIコンテナが無い世界での依存性注入
 *     ASP.NET Core なら services.AddScoped<IBookRepository, EfBookRepository>() と
 *     登録すればコンストラクタに勝手に入ってきます。Express にその仕組みはありません。
 *     代わりに **「アプリを組み立てる関数」を作って、引数で渡す** だけです:
 *
 *       export function createApp(deps: Deps): express.Express { ... }
 *
 *       本番:   createApp({ bookRepo: new PrismaBookRepository(prisma), ... })
 *       テスト: createApp({ bookRepo: fakeBookRepo, ... })
 *
 *     これがこのユニットの演習・テストの土台になります。テストは supertest で
 *     この app を **サーバを起動せずに** 直接叩くので、DBもGCPも要りません。
 *     「手で new して渡す」のは原始的に見えますが、依存関係が全部1箇所に
 *     書いてあるという意味では、むしろ読みやすい方式です(C# でも "Pure DI" と呼ばれます)。
 *
 *   ● express.Router — ルートのまとまりを別ファイルに切り出す
 *       const router = express.Router();
 *       router.get("/:id", handler);        // パスは「この router 以下」の相対
 *       app.use("/api/books", router);      // ← ここで /api/books/:id になる
 *     C# の Controller クラス + [Route("api/books")] とほぼ同じ役割です。
 *     ルートが増えたらファイルを分ける、その単位が Router。
 *
 *   ● service はどうやって 404 を伝えるのか
 *     service は res を持っていないので「404を返す」ことができません。
 *     代わりに **例外を投げます**(概念3の HttpError)。
 *     route か、集中エラーハンドラがそれをHTTPに翻訳します。
 *     C# で service が KeyNotFoundException や自前の NotFoundException を投げ、
 *     ミドルウェアが 404 に変換するのと同じ流儀です。
 * ===================================================================== */

import express from "express";
import type { ErrorRequestHandler } from "express";
import { z } from "zod";
import type { AddressInfo } from "node:net";

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

// --- 実験用の小道具(概念1〜3と同じ・書き換え不要) -------------------------
async function withServer(app: express.Express, fn: (base: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}
type Hit = { status: number; body: unknown };
async function hit(url: string, init?: RequestInit): Promise<Hit> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = `(JSONではない) ${text.slice(0, 60).replace(/\n/g, "")}`; }
  return { status: res.status, body };
}
function fmt(h: Hit): string { return `status=${h.status} body=${JSON.stringify(h.body)}`; }

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message?: string) {
    super(message ?? code);
    this.name = "HttpError";
  }
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 同じ1本のAPIを route / service / repository に切り分け、
//       repository だけを差し替えて挙動を変えられる(= テストできる)状態を作る。

// ==== 層0: ドメインの型 — 全層が共有する「アプリの言葉」 ====
type Book = { id: number; title: string; author: string };
type BookDetail = { id: number; title: string; author: string; borrowCount: number };

// ==== 層3: repository のインターフェース(「形」の宣言だけ。実装はまだ無い) ====
//   本番では bookRepo は Prisma(unit04)、statsRepo は BigQuery(unit05)が入る。
//   service はどちらが来るかを知らないので、DBを差し替えても service は無傷。
interface BookRepository {
  search(q: string, limit: number): Promise<Book[]>;
  findById(id: number): Promise<Book | null>;
}
interface StatsRepository {
  getBorrowCount(bookId: number): Promise<number>;
}

// STEP 1: repository の「本番の代わり」を作る(メモリ上の偽物)
//   implements を書いていないのに BookRepository として通るのが構造的部分型。
const BOOKS: Book[] = [
  { id: 1, title: "吾輩は猫である", author: "夏目漱石" },
  { id: 2, title: "坊っちゃん", author: "夏目漱石" },
  { id: 3, title: "走れメロス", author: "太宰治" },
];
const BORROW: Record<number, number> = { 1: 12, 2: 5, 3: 30 };

//   呼び出し回数を数えておくと「本当にその層が呼ばれたか」をテストで確認できる
const callCount = { search: 0, findById: 0, borrow: 0 };

const memoryBookRepo: BookRepository = {
  async search(q, limit) {
    callCount.search++;
    // 本番ではここが prisma.book.findMany({ where: { title: { contains: q } }, take: limit })
    return BOOKS.filter((b) => b.title.includes(q) || b.author.includes(q)).slice(0, limit);
  },
  async findById(id) {
    callCount.findById++;
    // 本番ではここが prisma.book.findUnique({ where: { id } })
    return BOOKS.find((b) => b.id === id) ?? null;
  },
};
const memoryStatsRepo: StatsRepository = {
  async getBorrowCount(bookId) {
    callCount.borrow++;
    // 本番ではここが BigQuery への SELECT COUNT(*) ... WHERE book_id = @bookId
    return BORROW[bookId] ?? 0;
  },
};

// STEP 2: service — ユースケースを組み立てる。req も res も出てこないことに注目
type Deps = { bookRepo: BookRepository; statsRepo: StatsRepository };

function createBookService(deps: Deps) {
  return {
    // ユースケース1: 検索(1つの repository で足りる)
    async search(q: string, limit: number): Promise<Book[]> {
      return deps.bookRepo.search(q, limit);
    },
    // ユースケース2: 詳細(2つのデータストアをまたいで合体する = サーバ側でやる仕事)
    async getDetail(id: number): Promise<BookDetail> {
      const book = await deps.bookRepo.findById(id);
      if (book === null) {
        // ここで 404 を「返す」ことはできない(res が無い)。だから投げる
        throw new HttpError(404, "not_found", `book id=${id} が見つかりません`);
      }
      const borrowCount = await deps.statsRepo.getBorrowCount(book.id);
      return { ...book, borrowCount };
    },
  };
}
type BookService = ReturnType<typeof createBookService>;
//   ↑ ReturnType<typeof f> は「関数 f の戻り値の型」。
//     service の形を手で書き写さずに型として使い回せる便利な道具です。

// STEP 3: route — HTTPとの変換だけを担当する薄い層
const ListQuerySchema = z.object({
  q: z.string().min(1).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const IdParamSchema = z.object({ id: z.coerce.number().int().min(1) });

function createBooksRouter(service: BookService): express.Router {
  const router = express.Router(); // C#: [Route("api/books")] を付けた Controller

  router.get("/", async (req, res) => {
    const parsed = ListQuerySchema.safeParse(req.query);        // ① 入口検証(概念2)
    if (!parsed.success) { res.status(400).json({ error: "invalid_query" }); return; }
    const items = await service.search(parsed.data.q, parsed.data.limit); // ② 業務は service へ丸投げ
    res.json({ total: items.length, items });                   // ③ HTTPの形に変換
  });

  router.get("/:id", async (req, res) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) { res.status(400).json({ error: "invalid_params" }); return; }
    const detail = await service.getDetail((parsed.data as { id: number }).id);
    // 見つからないときの 404 は service が投げた HttpError を
    // エラーハンドラが翻訳してくれる。ここに if は要らない(概念3)
    res.json(detail);
  });

  return router;
}

// STEP 4: アプリの組み立て。依存が「1箇所にまとまって見える」のがこの関数の価値
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.code }); return; }
  console.log("  [server log] 想定外:", (err as Error).message);
  res.status(500).json({ error: "internal_error" });
};

function createApp(deps: Deps): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/books", createBooksRouter(createBookService(deps))); // ← ここで層が繋がる
  app.use((_req, res) => { res.status(404).json({ error: "route_not_found" }); });
  app.use(errorHandler); // いちばん最後(概念3)
  return app;
}

// STEP 5: 本番相当の依存で組み立てて叩く
const app = createApp({ bookRepo: memoryBookRepo, statsRepo: memoryStatsRepo });
await withServer(app, async (base) => {
  console.log("STEP 5: サーバ起動 →", base);
  console.log("  検索        :", fmt(await hit(`${base}/api/books?q=夏目漱石`)));
  console.log("  詳細(合体) :", fmt(await hit(`${base}/api/books/3`)));
  console.log("  詳細(無し) :", fmt(await hit(`${base}/api/books/999`)));
  console.log("  不正なid    :", fmt(await hit(`${base}/api/books/abc`)));
});
console.log("STEP 5: repository の呼び出し回数 =", callCount);
//   ★ /api/books/3 の1リクエストで、bookRepo と statsRepo の **両方** が呼ばれ、
//     結果が1つのJSONに合体しています。これが「複数ストアをまたぐ集約はサーバ側」の実物です。
//     ブラウザから直接やろうとすると、BigQuery の鍵をブラウザに渡すことになります(概念5)。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) bookRepo だけを「常に空配列/null を返す実装」に差し替えたら、
//       GET /api/books?q=夏目漱石 の body は? GET /api/books/3 のステータスは?
//   (2) statsRepo だけを「必ず例外を投げる実装」に差し替えたら、
//       GET /api/books/3 のステータスは何番? そして route のコードは1行でも変わる?
//   (3) (2) のとき、bookRepo.findById は呼ばれる? 呼ばれない?
//       (service の getDetail のコードを上から読んで考えてください)
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) 空っぽのDB(移行直後・初回起動時によくある状態)
const emptyBookRepo: BookRepository = {
  async search() { return []; },
  async findById() { return null; },
};
const appEmpty = createApp({ bookRepo: emptyBookRepo, statsRepo: memoryStatsRepo });
await withServer(appEmpty, async (base) => {
  console.log("変えてみる (1) 空DB 検索 :", fmt(await hit(`${base}/api/books?q=夏目漱石`)));
  console.log("変えてみる (1) 空DB 詳細 :", fmt(await hit(`${base}/api/books/3`)));
});

// (2)(3) BigQuery が落ちている状況を再現する
const brokenStatsRepo: StatsRepository = {
  async getBorrowCount() { throw new Error("BigQuery: Could not authenticate (project=my-secret-project)"); },
};
const before = { ...callCount };
const appBroken = createApp({ bookRepo: memoryBookRepo, statsRepo: brokenStatsRepo });
await withServer(appBroken, async (base) => {
  console.log("変えてみる (2) 集計が死んだ:", fmt(await hit(`${base}/api/books/3`)));
  console.log("変えてみる (3) findById は呼ばれた?", callCount.findById > before.findById);
});
//   ※ (2) が 500 になるのに、route も service も1行も変えていません。
//     「差し替えるのは repository だけ」で異常系を再現できる、これが層分離の実利です。
//     unit06 の演習テスト(supertest)も、まさにこの差し替えでDB無しに全部を検証します。
//   ※ (2) のレスポンスに project 名が漏れていないことも確認してください。
//     概念3のエラーハンドラが効いています。

// --- 書いてみる ---------------------------------------------------------
// 課題: service 層の関数 searchWithStats を書いてください。
//   ・引数 q で memoryBookRepo.search(q, 10) を呼んで本の一覧を得る
//   ・その1件ごとに memoryStatsRepo.getBorrowCount(本のid) を呼ぶ
//   ・{ title: 本のタイトル, borrowCount: 貸出回数 } の配列を、検索結果と同じ順で返す
//   ・req / res は一切使わない(この関数はHTTPを知らない層です)
// ヒント(概念レベル): map で「Promiseの配列」を作って、unit01 で学んだ
//   「複数の待ちをまとめて待つ」やり方で1つの Promise にまとめます。
//   (for ループで1件ずつ await しても正解になります)
type SearchWithStats = (q: string) => Promise<Array<{ title: string; borrowCount: number }>>;
let searchWithStats: SearchWithStats | null = null;
// ここに書く(searchWithStats に async の関数を代入する)

// 判定用のアプリ(書き換え不要)
//   関数を引数で受け取る形にしているのは、未記入(null)のままでも
//   TypeScript の型検査が通るようにするためです(判定の都合であって、解答ではありません)
function createSearchApp(fn: SearchWithStats | null): express.Express {
  const app = express();
  app.get("/api/search-stats", async (req, res) => {
    if (fn === null) { res.status(501).json({ error: "not_implemented" }); return; }
    const q = typeof req.query.q === "string" ? req.query.q : "";
    res.json(await fn(q));
  });
  app.use(errorHandler);
  return app;
}
const app4 = createSearchApp(searchWithStats);

let result4: { status: number; body: unknown } | null = null;
await withServer(app4, async (base) => {
  const r = await hit(`${base}/api/search-stats?q=夏目漱石`);
  console.log("  判定用リクエスト:", fmt(r));
  result4 = { status: r.status, body: r.body };
});

check("概念4: service 層を書く", result4,
  {
    status: 200,
    body: [{ title: "吾輩は猫である", borrowCount: 12 }, { title: "坊っちゃん", borrowCount: 5 }],
  },
  "status が 501 → searchWithStats が未記入。" +
  "borrowCount が {} や null → getBorrowCount の await 忘れ(Promise がそのまま入っている)。" +
  "body が [] → search の第2引数(limit)を渡し忘れたか、q が渡っていない。" +
  "status が 500 → 関数の中で例外(サーバログの行を見てください)。" +
  "キーの順や名前違い → { title, borrowCount } の順・この名前ちょうどで返す");

export {};
