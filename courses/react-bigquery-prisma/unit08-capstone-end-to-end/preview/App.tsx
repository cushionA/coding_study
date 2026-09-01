/* =====================================================================
 * unit08 プレビュー — 検索UI(デバウンス)と degrade を手で触って確かめる
 * ---------------------------------------------------------------------
 * 起動方法(cwd = courses/react-bigquery-prisma/):
 *   npx vite unit08-capstone-end-to-end/preview --config vite.config.ts --port 5174
 * ブラウザで http://localhost:5174/ を開く。
 *
 * ★ このファイルは「手で触って壊して直す」ための遊び場です。採点はしません。
 * ★ 通信は一切しません。unit06 の Express + Prisma + BigQuery の代わりに、
 *   下の fakeApi が setTimeout で遅延を作って偽のレスポンスを返します。
 *
 * ▼ 試してみる
 *   1. ゆっくり打つ / 速く打つ で、右下のリクエストログの増え方を比べる
 *   2. デバウンス待ち時間を 0ms にして、1文字ごとにリクエストが飛ぶのを見る
 *   3. 「BigQuery を落とす」にチェック → 一覧は出たまま、集計だけ警告に変わる
 *   4. 「DB を落とす」にチェック → 今度は画面全体がエラーになる(必須が落ちたので正しい)
 *   5. 「応答を遅くする」で 1500ms にして、打っている途中の「読み込み中」を観察する
 * ===================================================================== */

import { useEffect, useState } from "react";

// =====================================================================
// 偽サーバ(unit06 の Express + unit04 の Prisma + unit05 の BigQuery の代役)
// =====================================================================
type Book = { id: number; title: string; author: string };
type AuthorCount = { author: string; count: number };

const CATALOG: Book[] = [
  { id: 1, title: "吾輩は猫である", author: "夏目漱石" },
  { id: 2, title: "坊っちゃん", author: "夏目漱石" },
  { id: 3, title: "こころ", author: "夏目漱石" },
  { id: 4, title: "走れメロス", author: "太宰治" },
  { id: 5, title: "人間失格", author: "太宰治" },
  { id: 6, title: "羅生門", author: "芥川龍之介" },
];

type ApiResponse = {
  q: string; total: number; items: Book[];
  summary: AuthorCount[] | null; degraded: string[];
};
type Faults = { dbDown: boolean; bqDown: boolean; delayMs: number };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** GET /api/books?q=... 相当。degrade の判断はサーバ側(= ここ)にある。 */
async function fakeApi(q: string, faults: Faults): Promise<Response> {
  await sleep(faults.delayMs);
  if (faults.dbDown) {
    // 必須(一覧)が落ちた → 500。詳細(SQLITE_BUSY 等)は外に出さない
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  const items = CATALOG.filter((b) => b.title.includes(q) || b.author.includes(q));
  const counts = new Map<string, number>();
  for (const b of CATALOG) counts.set(b.author, (counts.get(b.author) ?? 0) + 1);
  const summary = [...counts].map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count);
  const body: ApiResponse = {
    q, total: items.length, items,
    summary: faults.bqDown ? null : summary,      // 任意(集計)が落ちても一覧は返す
    degraded: faults.bqDown ? ["summary"] : [],   // 劣化は隠さず明示する
  };
  return new Response(JSON.stringify(body), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

// =====================================================================
// 概念1: デバウンス用カスタムフック(効いているのは clearTimeout の方)
// =====================================================================
function useDebouncedValue(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// =====================================================================
// 4+1 状態(unit07 概念5 の ViewState に degrade を足したもの)
// =====================================================================
type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; items: Book[]; summary: AuthorCount[] | null; degraded: string[] };

export function App() {
  const [q, setQ] = useState("");
  const [delay, setDelay] = useState(300);
  const [faults, setFaults] = useState<Faults>({ dbDown: false, bqDown: false, delayMs: 400 });
  const [log, setLog] = useState<string[]>([]);
  const [state, setState] = useState<ViewState>({ status: "idle" });

  const debouncedQ = useDebouncedValue(q, delay);

  useEffect(() => {
    if (debouncedQ === "") { setState({ status: "idle" }); return; }
    let alive = true;
    setState({ status: "loading" });
    const at = new Date().toLocaleTimeString("ja-JP");
    setLog((prev) => [`${at}  GET /api/books?q=${debouncedQ}`, ...prev].slice(0, 30));
    (async () => {
      const res = await fakeApi(debouncedQ, faults);
      if (!alive) return;                       // 古い応答で新しい結果を上書きしない
      if (!res.ok) { setState({ status: "error", message: `サーバエラー (HTTP ${res.status})` }); return; }
      const data = (await res.json()) as ApiResponse;
      if (!alive) return;
      setState(data.items.length === 0
        ? { status: "empty" }
        : { status: "success", items: data.items, summary: data.summary, degraded: data.degraded });
    })();
    return () => { alive = false; };
  }, [debouncedQ, faults]);

  return (
    <main>
      <h1>unit08 プレビュー — 検索UI と degrade</h1>

      <section>
        <h2>検索(制御コンポーネント + デバウンス {delay}ms)</h2>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="書名か著者" />
        <button onClick={() => setQ("")}>クリア</button>
        <span className="badge">入力: {q === "" ? "(空)" : q}</span>
        <span className="badge">通信に使う語: {debouncedQ === "" ? "(空)" : debouncedQ}</span>
        <p className="muted">
          「クリア」で入力欄が空になるのは、value を state が持っている(制御している)から。
        </p>
      </section>

      <section>
        <h2>結果</h2>
        {state.status === "idle" && <p className="muted">検索語を入力してください</p>}
        {state.status === "loading" && <p>読み込み中...</p>}
        {state.status === "empty" && <p>該当する本はありません</p>}
        {state.status === "error" && <p className="error">読み込みに失敗しました: {state.message}</p>}
        {state.status === "success" && (
          <>
            <ul>{state.items.map((b) => <li key={b.id}>{b.title}({b.author})</li>)}</ul>
            {state.degraded.includes("summary")
              ? <p className="warn">集計は一時的に表示できません(一覧は最新です)</p>
              : <p>著者別: {(state.summary ?? []).map((s) => `${s.author} ${s.count}件`).join(" / ")}</p>}
          </>
        )}
      </section>

      <section>
        <h2>障害を起こしてみる</h2>
        <label>
          <input type="checkbox" checked={faults.bqDown}
            onChange={(e) => setFaults({ ...faults, bqDown: e.target.checked })} />
          BigQuery を落とす(任意のデータ → degrade する)
        </label><br />
        <label>
          <input type="checkbox" checked={faults.dbDown}
            onChange={(e) => setFaults({ ...faults, dbDown: e.target.checked })} />
          DB を落とす(必須のデータ → 500 にする)
        </label><br />
        <label>
          デバウンス待ち:
          <input type="text" value={String(delay)} style={{ width: 60, marginLeft: 6 }}
            onChange={(e) => setDelay(Number(e.target.value) || 0)} /> ms
        </label>{" "}
        <label>
          応答の遅さ:
          <input type="text" value={String(faults.delayMs)} style={{ width: 60, marginLeft: 6 }}
            onChange={(e) => setFaults({ ...faults, delayMs: Number(e.target.value) || 0 })} /> ms
        </label>
      </section>

      <section>
        <h2>リクエストログ(サーバに実際に飛んだ回数)</h2>
        <div className="log">
          {log.length === 0 ? "(まだ1件も飛んでいません)" : log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <p className="muted">
          StrictMode が有効なので、開発中は effect が2回走ります。cleanup が正しければ
          結果は変わりません(ログには2行出ることがあります)。
        </p>
      </section>
    </main>
  );
}
