/* =====================================================================
 * lesson 用の「偽物 BigQuery」— 学習の道具であって、学習の対象ではない
 * ---------------------------------------------------------------------
 * このコースは GCP アカウントが無くても最後まで進める設計です。そのため
 * lesson/03〜05 では、本物の BigQuery の代わりにこのファイルが提供する
 * インメモリの偽クライアントを使います。ネットワークには一切出ません。
 *
 * ここで公開している型(BigQueryLike / QueryLike / TableLike ...)は、
 * 本物の @google-cloud/bigquery の「よく使う部分だけ」を写し取った
 * 最小インターフェースです。C# で言えば、本物の BigQueryClient に対して
 * IBigQueryClient を切り出し、テストでは InMemoryBigQueryClient を
 * 注入する——あの「インターフェースへの依存」とまったく同じ発想です。
 * 演習(ex01〜ex04)もこの形で採点されます。
 *
 * 中の SQL エンジンは学習用のごく単純な実装です。本物の GoogleSQL とは
 * 比べものにならないほど非力で、次の形しか解釈できません:
 *
 *   SELECT <列, ... | * | COUNT(*) AS 別名>
 *   FROM `プロジェクト.データセット.テーブル`
 *   [WHERE 条件 (AND / OR / = != > >= < <= / @パラメータ / 'literal')]
 *   [GROUP BY 列]
 *   [ORDER BY 列 (ASC|DESC)]
 *   [LIMIT n]
 *
 * 中身を読む必要はありません(読んでも構いませんが、今日の学習対象では
 * ありません)。lesson 側では「本物と同じ呼び方で呼べる箱」として扱います。
 * ===================================================================== */

// --- BigQuery の型システム(本物と同じ名前・同じ意味) ---------------------
export type BqType = "STRING" | "INT64" | "FLOAT64" | "BOOL" | "TIMESTAMP" | "DATE";
export type BqMode = "REQUIRED" | "NULLABLE" | "REPEATED";
export type BqField = { name: string; type: BqType; mode: BqMode };
export type BqSchema = { fields: BqField[] };

/** BigQuery の1行。列名 → 値 の辞書(C# の Dictionary<string, object?>)。 */
export type Row = Record<string, unknown>;

/** bq.query(...) / bq.createQueryJob(...) に渡すオプション。本物の Query 型の部分集合。 */
export type QueryLike = {
  query: string;
  params?: Record<string, unknown>;
  dryRun?: boolean;
};

export interface TableLike {
  readonly id: string;
  /** ストリーミング挿入。一部の行だけ失敗すると PartialFailureError を投げる。 */
  insert(rows: Row[]): Promise<void>;
}

export interface DatasetLike {
  readonly id: string;
  table(tableId: string): TableLike;
}

/** dryRun のときに返ってくるジョブ。見積りバイト数は「文字列」で入っている(本物と同じ)。 */
export interface JobLike {
  metadata: { statistics: { totalBytesProcessed: string } };
}

/** これが lesson / 演習で使う最小インターフェース。 */
export interface BigQueryLike {
  readonly projectId: string;
  /** 結果は [rows] の配列で返る(本物と同じ。分割代入 const [rows] = ... で受ける)。 */
  query(options: QueryLike): Promise<[Row[]]>;
  /** dryRun: true と組み合わせて「実行せずに見積りだけ」取るのに使う。 */
  createQueryJob(options: QueryLike): Promise<[JobLike]>;
  dataset(datasetId: string): DatasetLike;
}

/** 本物の PartialFailureError と同じ形(name / errors[].row / errors[].errors[].message)。 */
export class FakePartialFailureError extends Error {
  override name = "PartialFailureError";
  errors: { row: Row; errors: { message: string; reason: string }[] }[];
  constructor(errors: { row: Row; errors: { message: string; reason: string }[] }[]) {
    super("A failure occurred during this request.");
    this.errors = errors;
  }
}

export type FakeTableDef = { schema: BqSchema; rows?: Row[] };

export type FakeBigQuery = BigQueryLike & {
  /** 実際に「BigQuery へ送られた」SQL 文字列の記録(パラメータ化の確認に使う)。 */
  sentQueries: string[];
  /** テーブルに今入っている行(挿入結果の確認に使う)。 */
  rowsOf(tableId: string): Row[];
  schemaOf(tableId: string): BqSchema;
};

// --- ここから下は実装(学習対象外) ---------------------------------------

function utf8Len(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

function scalarBytes(type: BqType, v: unknown): number {
  if (v === null || v === undefined) return 0;
  switch (type) {
    case "STRING":
      return 2 + utf8Len(String(v));
    case "BOOL":
      return 1;
    default:
      return 8; // INT64 / FLOAT64 / TIMESTAMP / DATE
  }
}

function fieldBytes(field: BqField, value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (field.mode === "REPEATED" && Array.isArray(value)) {
    return value.reduce<number>((a, v) => a + scalarBytes(field.type, v), 0);
  }
  return scalarBytes(field.type, value);
}

function validateRow(schema: BqSchema, row: Row): { message: string; reason: string }[] {
  const errors: { message: string; reason: string }[] = [];
  const known = new Set(schema.fields.map((f) => f.name));
  for (const key of Object.keys(row)) {
    if (!known.has(key)) {
      errors.push({ message: `no such field: ${key}.`, reason: "invalid" });
    }
  }
  for (const f of schema.fields) {
    const v = row[f.name];
    if (v === undefined || v === null) {
      if (f.mode === "REQUIRED") {
        errors.push({ message: `Missing required field: ${f.name}.`, reason: "invalid" });
      }
      continue;
    }
    if (f.mode === "REPEATED") {
      if (!Array.isArray(v)) {
        errors.push({ message: `Array specified for non-repeated field: ${f.name}.`, reason: "invalid" });
        continue;
      }
      for (const item of v) {
        if (!scalarOk(f.type, item)) {
          errors.push({ message: `Cannot convert value to ${f.type} (field: ${f.name}).`, reason: "invalid" });
          break;
        }
      }
      continue;
    }
    if (Array.isArray(v)) {
      errors.push({ message: `Array specified for non-repeated field: ${f.name}.`, reason: "invalid" });
      continue;
    }
    if (!scalarOk(f.type, v)) {
      errors.push({ message: `Cannot convert value to ${f.type} (field: ${f.name}).`, reason: "invalid" });
    }
  }
  return errors;
}

function scalarOk(type: BqType, v: unknown): boolean {
  switch (type) {
    case "STRING":
      return typeof v === "string";
    case "INT64":
      return typeof v === "number" && Number.isInteger(v);
    case "FLOAT64":
      return typeof v === "number";
    case "BOOL":
      return typeof v === "boolean";
    case "TIMESTAMP":
      return typeof v === "string" && !Number.isNaN(Date.parse(v));
    case "DATE":
      return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  }
}

type SelectItem =
  | { kind: "col"; name: string; alias: string }
  | { kind: "count"; alias: string };

function splitTop(expr: string, sep: RegExp): string[] {
  // 学習用の割り切り: 引用符の中は考慮しない(だからこそ文字列連結の危険が再現できる)
  return expr.split(sep).map((s) => s.trim()).filter((s) => s.length > 0);
}

function resolveOperand(tok: string, row: Row, params: Record<string, unknown>): unknown {
  const t = tok.trim().replace(/^\(+|\)+$/g, "").trim();
  if (t.startsWith("@")) {
    const key = t.slice(1);
    if (!(key in params)) {
      throw new Error(`Undeclared query parameter '${key}' — params にそのキーがありません`);
    }
    return params[key];
  }
  if (/^'[\s\S]*'$/.test(t)) return t.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^TRUE$/i.test(t)) return true;
  if (/^FALSE$/i.test(t)) return false;
  if (/^NULL$/i.test(t)) return null;
  return row[t];
}

function compare(a: unknown, op: string, b: unknown): boolean {
  switch (op) {
    case "=":
      return a === b;
    case "!=":
    case "<>":
      return a !== b;
    default:
      break;
  }
  if (a === null || a === undefined || b === null || b === undefined) return false;
  const x = a as number | string;
  const y = b as number | string;
  switch (op) {
    case ">":
      return x > y;
    case ">=":
      return x >= y;
    case "<":
      return x < y;
    case "<=":
      return x <= y;
    default:
      throw new Error(`このフェイクエンジンは演算子 '${op}' に対応していません`);
  }
}

function evalWhere(expr: string, row: Row, params: Record<string, unknown>): boolean {
  const ors = splitTop(expr, /\s+OR\s+/i);
  if (ors.length > 1) return ors.some((p) => evalWhere(p, row, params));
  const ands = splitTop(expr, /\s+AND\s+/i);
  if (ands.length > 1) return ands.every((p) => evalWhere(p, row, params));
  const m = /^\(?\s*(.+?)\s*(>=|<=|!=|<>|=|>|<)\s*(.+?)\s*\)?$/.exec(ands[0] ?? expr);
  if (!m) throw new Error(`このフェイクエンジンは条件 '${expr}' を解釈できません`);
  return compare(resolveOperand(m[1]!, row, params), m[2]!, resolveOperand(m[3]!, row, params));
}

type ParsedQuery = {
  tableId: string;
  items: SelectItem[];
  where?: string;
  groupBy?: string;
  orderBy?: { col: string; dir: "ASC" | "DESC" };
  limit?: number;
};

function parseQuery(sql: string): ParsedQuery {
  let s = sql.replace(/\s+/g, " ").trim().replace(/;$/, "").trim();
  const head = /^SELECT (.+?) FROM `?([\w.\-]+)`?(.*)$/i.exec(s);
  if (!head) throw new Error(`このフェイクエンジンは次のSQLを解釈できません: ${sql}`);
  const selectList = head[1]!;
  const fqName = head[2]!;
  let rest = head[3] ?? "";

  let limit: number | undefined;
  const limitM = /\s+LIMIT\s+(\d+)$/i.exec(rest);
  if (limitM) {
    limit = Number(limitM[1]);
    rest = rest.slice(0, limitM.index);
  }
  let orderBy: { col: string; dir: "ASC" | "DESC" } | undefined;
  const orderM = /\s+ORDER BY\s+(.+)$/i.exec(rest);
  if (orderM) {
    const parts = orderM[1]!.trim().split(/\s+/);
    orderBy = { col: parts[0]!, dir: /^DESC$/i.test(parts[1] ?? "") ? "DESC" : "ASC" };
    rest = rest.slice(0, orderM.index);
  }
  let groupBy: string | undefined;
  const groupM = /\s+GROUP BY\s+(.+)$/i.exec(rest);
  if (groupM) {
    groupBy = groupM[1]!.trim();
    rest = rest.slice(0, groupM.index);
  }
  let where: string | undefined;
  const whereM = /^\s+WHERE\s+(.+)$/i.exec(rest);
  if (whereM) {
    where = whereM[1]!.trim();
    rest = "";
  }
  if (rest.trim().length > 0) {
    throw new Error(`このフェイクエンジンは次の部分を解釈できません: '${rest.trim()}'`);
  }

  const items: SelectItem[] = selectList.split(",").map((raw) => {
    const piece = raw.trim();
    const countM = /^COUNT\(\s*\*\s*\)(?:\s+AS\s+(\w+))?$/i.exec(piece);
    if (countM) return { kind: "count", alias: countM[1] ?? "f0_" };
    const colM = /^([\w*]+)(?:\s+AS\s+(\w+))?$/i.exec(piece);
    if (!colM) throw new Error(`このフェイクエンジンは選択項目 '${piece}' を解釈できません`);
    return { kind: "col", name: colM[1]!, alias: colM[2] ?? colM[1]! };
  });

  const tableId = fqName.split(".").pop()!;
  return { tableId, items, where, groupBy, orderBy, limit };
}

/** BigQuery が課金対象とする「スキャンした列 × 全行」のバイト数を見積もる。 */
function scannedBytes(schema: BqSchema, rows: Row[], p: ParsedQuery): number {
  const cols = new Set<string>();
  for (const it of p.items) {
    if (it.kind === "col") {
      if (it.name === "*") schema.fields.forEach((f) => cols.add(f.name));
      else cols.add(it.name);
    }
    // COUNT(*) はどの列も読まない → 0 バイト(本物の BigQuery も同じ)
  }
  for (const src of [p.where, p.groupBy, p.orderBy?.col]) {
    if (!src) continue;
    for (const f of schema.fields) {
      if (new RegExp(`\\b${f.name}\\b`).test(src)) cols.add(f.name);
    }
  }
  let total = 0;
  for (const f of schema.fields) {
    if (!cols.has(f.name)) continue;
    for (const row of rows) total += fieldBytes(f, row[f.name]);
  }
  return total;
}

function sortRows(rows: Row[], orderBy: { col: string; dir: "ASC" | "DESC" }): Row[] {
  const { col, dir } = orderBy;
  return [...rows].sort((a, b) => {
    const x = a[col] as number | string | null | undefined;
    const y = b[col] as number | string | null | undefined;
    if (x === y) return 0;
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    const cmp = x < y ? -1 : 1;
    return dir === "DESC" ? -cmp : cmp;
  });
}

export function createFakeBigQuery(cfg: {
  projectId: string;
  datasetId: string;
  tables: Record<string, FakeTableDef>;
}): FakeBigQuery {
  const store = new Map<string, { schema: BqSchema; rows: Row[] }>();
  for (const [id, def] of Object.entries(cfg.tables)) {
    store.set(id, { schema: def.schema, rows: (def.rows ?? []).map((r) => ({ ...r })) });
  }
  const sentQueries: string[] = [];

  function tableOf(tableId: string): { schema: BqSchema; rows: Row[] } {
    const t = store.get(tableId);
    if (!t) throw new Error(`Not found: Table ${cfg.projectId}.${cfg.datasetId}.${tableId}`);
    return t;
  }

  function run(options: QueryLike): { rows: Row[]; bytes: number } {
    sentQueries.push(options.query);
    const params = options.params ?? {};
    const p = parseQuery(options.query);
    const t = tableOf(p.tableId);
    const bytes = scannedBytes(t.schema, t.rows, p);

    let filtered = p.where ? t.rows.filter((r) => evalWhere(p.where!, r, params)) : [...t.rows];

    const hasAgg = p.items.some((it) => it.kind === "count");
    // 非集計クエリの ORDER BY は「元の行」に対して効かせる
    // (SELECT に出していない列で並べ替えても動くようにするため)
    if (!hasAgg && p.orderBy) filtered = sortRows(filtered, p.orderBy);

    let out: Row[];
    if (hasAgg) {
      const keyCols = p.groupBy ? p.groupBy.split(",").map((c) => c.trim()) : [];
      const groups = new Map<string, Row[]>();
      for (const r of filtered) {
        const key = JSON.stringify(keyCols.map((c) => r[c]));
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
      }
      if (keyCols.length === 0 && groups.size === 0) groups.set("[]", []);
      out = [...groups.values()].map((rowsInGroup) => {
        const o: Row = {};
        for (const it of p.items) {
          if (it.kind === "count") o[it.alias] = rowsInGroup.length;
          else o[it.alias] = rowsInGroup[0]?.[it.name] ?? null;
        }
        return o;
      });
    } else {
      out = filtered.map((r) => {
        const o: Row = {};
        for (const it of p.items) {
          if (it.kind !== "col") continue;
          if (it.name === "*") Object.assign(o, r);
          else o[it.alias] = r[it.name] ?? null;
        }
        return o;
      });
    }

    if (hasAgg && p.orderBy) out = sortRows(out, p.orderBy);
    if (p.limit !== undefined) out = out.slice(0, p.limit);
    return { rows: out, bytes };
  }

  return {
    projectId: cfg.projectId,
    sentQueries,
    rowsOf(tableId: string) {
      return tableOf(tableId).rows.map((r) => ({ ...r }));
    },
    schemaOf(tableId: string) {
      return tableOf(tableId).schema;
    },
    async query(options: QueryLike): Promise<[Row[]]> {
      return [run(options).rows];
    },
    async createQueryJob(options: QueryLike): Promise<[JobLike]> {
      const { bytes } = run(options);
      return [{ metadata: { statistics: { totalBytesProcessed: String(bytes) } } }];
    },
    dataset(datasetId: string): DatasetLike {
      return {
        id: datasetId,
        table(tableId: string): TableLike {
          return {
            id: tableId,
            async insert(rows: Row[]): Promise<void> {
              const t = tableOf(tableId);
              const failures: { row: Row; errors: { message: string; reason: string }[] }[] = [];
              for (const row of rows) {
                const errs = validateRow(t.schema, row);
                if (errs.length > 0) failures.push({ row, errors: errs });
                else t.rows.push({ ...row });
              }
              if (failures.length > 0) throw new FakePartialFailureError(failures);
            },
          };
        },
      };
    },
  };
}
