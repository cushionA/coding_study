/* =====================================================================
 * lesson / 演習用の「偽物 Prisma クライアント」— 学習の道具であって学習対象ではない
 * ---------------------------------------------------------------------
 * unit03/04 では本物の Prisma + SQLite を動かしました。unit08 は
 * 「取り込み → 保存 → API → UI」の全経路を1本で扱うため、マイグレーションや
 * 一時ファイルの後片付けに気を取られないよう、メモリ上の偽クライアントを使います。
 *
 * 呼び出しの **形は本物と同じ** です:
 *     prisma.book.upsert({ where: { isbn }, update: {...}, create: {...} })
 *     prisma.book.findMany({ where: { title: { contains: q } }, orderBy: { id: "asc" }, take: 20 })
 *     prisma.$transaction(async (tx) => { ... })
 * なので、本番の PrismaClient に差し替えても呼び出し側のコードは変わりません。
 * C# で言えば IBookDbContext を切り出して InMemory 実装を注入するのと同じ発想
 * (unit06 概念4 の「インターフェースで受けて実装は外から渡す」の実物)。
 *
 * 中の検索エンジンは学習用の割り切りで、次の where しか解釈しません:
 *     { isbn: "..." }
 *     { title: { contains: "..." } } / { author: { contains: "..." } }
 *     { OR: [ { title: { contains } }, { author: { contains } } ] }
 * 中身を読む必要はありません(読んでも構いません)。
 * ===================================================================== */

/** アプリDB(正)に入っている本の1行。本番では Prisma の Book モデル。 */
export type BookRecord = {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publishedYear: number | null;
  updatedAt: string;
};

/** 取り込みジョブ1回分の記録。突合(reconcile)の起点になる大事なテーブル。 */
export type IngestRunRecord = {
  id: string;          // = バッチID。BigQuery 側の batch_id と突き合わせる鍵
  source: string;      // どこから取ったか
  startedAt: string;
  status: string;      // "running" | "ok" | "ok_with_warning" | "failed"
  upserted: number;    // 正(Prisma)に書けた件数
  analyticsSynced: boolean; // 副本(BigQuery)まで届いたか。false = 再送キュー行き
};

type Contains = { contains: string };
export type BookWhere = {
  isbn?: string;
  title?: Contains;
  author?: Contains;
  OR?: Array<{ title?: Contains; author?: Contains }>;
};
export type BookOrderBy = { id?: "asc" | "desc"; title?: "asc" | "desc"; author?: "asc" | "desc" };

export type BookUpsertArgs = {
  where: { isbn: string };
  update: { title: string; author: string; publishedYear: number | null; updatedAt: string };
  create: { isbn: string; title: string; author: string; publishedYear: number | null; updatedAt: string };
};
export type BookFindManyArgs = {
  where?: BookWhere;
  orderBy?: BookOrderBy;
  take?: number;
  skip?: number;
};

export interface BookDelegate {
  upsert(args: BookUpsertArgs): Promise<BookRecord>;
  findMany(args?: BookFindManyArgs): Promise<BookRecord[]>;
  count(args?: { where?: BookWhere }): Promise<number>;
  findUnique(args: { where: { isbn: string } }): Promise<BookRecord | null>;
}

export interface IngestRunDelegate {
  create(args: {
    data: { id: string; source: string; startedAt?: string; status?: string; upserted?: number; analyticsSynced?: boolean };
  }): Promise<IngestRunRecord>;
  update(args: { where: { id: string }; data: Partial<Omit<IngestRunRecord, "id">> }): Promise<IngestRunRecord>;
  findMany(): Promise<IngestRunRecord[]>;
}

/** 本番の PrismaClient と「この範囲で」同じ形。service 層はこの型にだけ依存する。 */
export interface PrismaLike {
  book: BookDelegate;
  ingestRun: IngestRunDelegate;
  $transaction<T>(fn: (tx: PrismaLike) => Promise<T>): Promise<T>;
}

/** 偽物だけが持つ確認用の口(本物には無い)。 */
export type FakePrisma = PrismaLike & {
  /** 今テーブルに入っている本(コピー)。 */
  books(): BookRecord[];
  ingestRuns(): IngestRunRecord[];
  /** 障害注入。null を渡すと解除。例: failOn("book.findMany", "SQLITE_BUSY") */
  failOn(op: "book.findMany" | "book.upsert" | "book.count", message: string | null): void;
};

// --- ここから下は実装(学習対象外) ---------------------------------------

function matchOne(b: BookRecord, w: { title?: Contains; author?: Contains; isbn?: string }): boolean {
  if (w.isbn !== undefined && b.isbn !== w.isbn) return false;
  if (w.title !== undefined && !b.title.includes(w.title.contains)) return false;
  if (w.author !== undefined && !b.author.includes(w.author.contains)) return false;
  return true;
}

function matches(b: BookRecord, where?: BookWhere): boolean {
  if (!where) return true;
  if (where.OR !== undefined) {
    if (!where.OR.some((w) => matchOne(b, w))) return false;
  }
  return matchOne(b, { isbn: where.isbn, title: where.title, author: where.author });
}

function sorted(rows: BookRecord[], orderBy?: BookOrderBy): BookRecord[] {
  if (!orderBy) return rows;
  const key = (Object.keys(orderBy) as Array<keyof BookOrderBy>)[0];
  if (key === undefined) return rows;
  const dir = orderBy[key] === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = a[key] as number | string;
    const y = b[key] as number | string;
    if (x === y) return 0;
    return (x < y ? -1 : 1) * dir;
  });
}

export function createFakePrisma(seed: { books?: BookRecord[]; runs?: IngestRunRecord[] } = {}): FakePrisma {
  let books: BookRecord[] = (seed.books ?? []).map((b) => ({ ...b }));
  let runs: IngestRunRecord[] = (seed.runs ?? []).map((r) => ({ ...r }));
  let nextId = books.reduce((m, b) => Math.max(m, b.id), 0) + 1;
  const failures = new Map<string, string>();

  function guard(op: string): void {
    const msg = failures.get(op);
    if (msg !== undefined) throw new Error(msg);
  }

  const client: FakePrisma = {
    book: {
      async upsert(args) {
        guard("book.upsert");
        const found = books.find((b) => b.isbn === args.where.isbn);
        if (found) {
          Object.assign(found, args.update);
          return { ...found };
        }
        const created: BookRecord = { id: nextId++, ...args.create };
        books.push(created);
        return { ...created };
      },
      async findMany(args) {
        guard("book.findMany");
        let out = books.filter((b) => matches(b, args?.where));
        out = sorted(out, args?.orderBy);
        if (args?.skip !== undefined) out = out.slice(args.skip);
        if (args?.take !== undefined) out = out.slice(0, args.take);
        return out.map((b) => ({ ...b }));
      },
      async count(args) {
        guard("book.count");
        return books.filter((b) => matches(b, args?.where)).length;
      },
      async findUnique(args) {
        const found = books.find((b) => b.isbn === args.where.isbn);
        return found ? { ...found } : null;
      },
    },
    ingestRun: {
      async create(args) {
        const rec: IngestRunRecord = {
          id: args.data.id,
          source: args.data.source,
          startedAt: args.data.startedAt ?? "2026-09-05T00:00:00Z",
          status: args.data.status ?? "running",
          upserted: args.data.upserted ?? 0,
          analyticsSynced: args.data.analyticsSynced ?? false,
        };
        runs.push(rec);
        return { ...rec };
      },
      async update(args) {
        const found = runs.find((r) => r.id === args.where.id);
        if (!found) throw new Error(`IngestRun id=${args.where.id} が見つかりません`);
        Object.assign(found, args.data);
        return { ...found };
      },
      async findMany() {
        return runs.map((r) => ({ ...r }));
      },
    },
    /**
     * 学習用の簡易トランザクション: 開始時にスナップショットを取り、
     * コールバックが例外で終わったら丸ごと巻き戻す(= ロールバック)。
     * 本物と同じく「例外が外まで伝わること」がロールバックの条件です。
     */
    async $transaction<T>(fn: (tx: PrismaLike) => Promise<T>): Promise<T> {
      const snapBooks = books.map((b) => ({ ...b }));
      const snapRuns = runs.map((r) => ({ ...r }));
      const snapNextId = nextId;
      try {
        return await fn(client);
      } catch (err) {
        books = snapBooks;
        runs = snapRuns;
        nextId = snapNextId;
        throw err;
      }
    },
    books() {
      return books.map((b) => ({ ...b }));
    },
    ingestRuns() {
      return runs.map((r) => ({ ...r }));
    },
    failOn(op, message) {
      if (message === null) failures.delete(op);
      else failures.set(op, message);
    },
  };
  return client;
}
