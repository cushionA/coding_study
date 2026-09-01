/* =====================================================================
 * unit07 プレビュー — 5つの概念を1画面で「動かして見る」
 * ---------------------------------------------------------------------
 * 起動方法(cwd = courses/react-bigquery-prisma/):
 *   npx vite unit07-react-ui/preview --config vite.config.ts --port 5173
 * ブラウザで http://localhost:5173/ を開く。
 * このファイルを保存すると、画面がリロードなしで即座に更新されます(HMR)。
 *
 * ★ このファイルは「手で触って壊して直す」ための遊び場です。採点はしません。
 *   lesson/*.tsx を読んで疑問に思ったことを、ここで実際に試してください。
 *   おすすめの実験は各セクションの「▼ 試してみる」に書いてあります。
 *
 * ★ 通信は一切しません。外部APIの代わりに、下の fakeFetch が
 *   setTimeout で遅延を作って偽のレスポンスを返します
 *   (unit06 で作った GET /api/books の身代わり)。
 * ===================================================================== */

import { useEffect, useState } from "react";

// =====================================================================
// 偽サーバ(unit06 の Express の代役)
// =====================================================================
type Book = { id: number; title: string; author: string; stock: number };

const CATALOG: Book[] = [
  { id: 11, title: "吾輩は猫である", author: "夏目漱石", stock: 3 },
  { id: 12, title: "坊っちゃん", author: "夏目漱石", stock: 0 },
  { id: 13, title: "こころ", author: "夏目漱石", stock: 7 },
  { id: 21, title: "走れメロス", author: "太宰治", stock: 2 },
  { id: 22, title: "人間失格", author: "太宰治", stock: 0 },
  { id: 31, title: "羅生門", author: "芥川龍之介", stock: 4 },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 本物の fetch と同じ形。q に "壊れる" を入れると 500 を返す(エラー表示の確認用) */
async function fakeFetch(url: string, init?: { signal?: AbortSignal }): Promise<Response> {
  const q = new URL(url, location.origin).searchParams.get("q") ?? "";
  console.log(`[fakeFetch] GET ${url}`); // ← StrictMode で2回出るのが確認できます
  await sleep(500); // わざと遅くして「読み込み中」を見えるようにしている
  if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
  if (q === "壊れる") return new Response("boom", { status: 500 });
  const items = CATALOG.filter((b) => b.title.includes(q) || b.author.includes(q));
  return new Response(JSON.stringify({ items }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

// =====================================================================
// 概念1: props で受け取って描くだけのコンポーネント
// =====================================================================
function AuthorBadge({ name, bookCount }: { name: string; bookCount: number }) {
  return <span className="badge">{name}(全{bookCount}冊)</span>;
}

function Concept1() {
  return (
    <section>
      <h2>概念1: 関数コンポーネントと props</h2>
      <p>
        同じ部品に違う値を渡すだけで、違う表示になります:
        <AuthorBadge name="夏目漱石" bookCount={3} />
        <AuthorBadge name="太宰治" bookCount={2} />
        <AuthorBadge name="芥川龍之介" bookCount={1} />
      </p>
      <p className="hint">
        ▼ 試してみる: bookCount={"{3}"} の中かっこを外して bookCount="3" にすると
        TypeScript が何と言うか。className を class に変えるとコンソールに何が出るか。
      </p>
    </section>
  );
}

// =====================================================================
// 概念2: useState とイベント(制御コンポーネント)
// =====================================================================
function Concept2() {
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState("");

  function add() {
    if (text.trim() === "") return;
    setItems([...items, text]); // ★ push ではなく新しい配列を作る
    setText("");                // 入力欄を空に戻す = state を空にするだけ
  }

  return (
    <section>
      <h2>概念2: useState とイベント</h2>
      <label htmlFor="memo">メモ </label>
      <input
        id="memo"
        value={text}                                   // 画面の値は state が持つ
        onChange={(e) => setText(e.target.value)}      // 入力のたびに state を更新
        onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        placeholder="打つと下に即時反映されます"
      />
      <button onClick={add}>追加</button>
      <p className="muted">入力中: 「{text}」(長さ {text.length})</p>
      <p>追加済み: {items.length === 0 ? <span className="muted">まだありません</span> : items.join(" / ")}</p>
      <p className="hint">
        ▼ 試してみる: onChange を消すと、打っても文字が出なくなります(state が
        変わらないから画面も変わらない)。setItems([...items, text]) を
        items.push(text) に変えると、追加しても表示が増えなくなります。
      </p>
    </section>
  );
}

// =====================================================================
// 概念3: map と key、条件描画
// =====================================================================
type Row = { id: number; name: string };

function Concept3() {
  const [keyMode, setKeyMode] = useState<"index" | "id">("index");
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "あ" },
    { id: 2, name: "い" },
    { id: 3, name: "う" },
  ]);
  const [nextId, setNextId] = useState(100);

  return (
    <section>
      <h2>概念3: map と key(index を key にすると何が壊れるか)</h2>
      <p>
        いまの key:{" "}
        <strong>{keyMode === "index" ? "配列の index(危険)" : "データの id(正しい)"}</strong>
        <button onClick={() => setKeyMode(keyMode === "index" ? "id" : "index")}>切り替える</button>
      </p>
      <ol className="hint">
        <li>どれかの行のメモ欄に文字を打つ</li>
        <li>「先頭に追加」を押す</li>
        <li>打った文字が、同じ行名について回るか / その場に残るかを見る</li>
      </ol>
      <button onClick={() => { setRows([{ id: nextId, name: `新${nextId}` }, ...rows]); setNextId(nextId + 1); }}>
        先頭に追加
      </button>
      <ul>
        {rows.map((r, i) => (
          <li key={keyMode === "index" ? i : r.id}>
            {r.name}{" "}
            <input placeholder="ここにメモを打つ" />
            {/* ↑ state を持たない素の input。DOM が使い回されれば文字が残る */}
          </li>
        ))}
      </ul>
      {/* 条件描画: 0件のときだけメッセージ。&& の左辺は必ず boolean にする */}
      {rows.length === 0 && <p className="muted">行がありません</p>}
      <p className="hint">
        ▼ 試してみる: 上の {"{rows.length === 0 && ...}"} を {"{rows.length && ...}"} に
        変えて、行を全部消すと画面に何が出るか(概念1・3の「0 は描画される」)。
      </p>
    </section>
  );
}

// =====================================================================
// 概念4+5: useEffect による取得と、4状態(loading / error / empty / success)
// =====================================================================
type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; books: Book[] };

/** 取得ロジックだけを切り出したカスタムフック */
function useBooks(q: string): ViewState {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fakeFetch(`/api/books?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) {
          if (alive) setState({ status: "error", message: `サーバエラー (HTTP ${res.status})` });
          return;
        }
        const data = (await res.json()) as { items: Book[] };
        if (!alive) return;
        setState(data.items.length === 0 ? { status: "empty" } : { status: "success", books: data.items });
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // キャンセルは異常ではない
        if (alive) setState({ status: "error", message: (e as Error).message });
      }
    })();

    return () => { alive = false; controller.abort(); };
  }, [q]);

  return state;
}

function Concept45() {
  const [q, setQ] = useState("");
  const state = useBooks(q);

  return (
    <section>
      <h2>概念4・5: useEffect で取得し、4状態を出し分ける</h2>
      <label htmlFor="q">検索 </label>
      <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="夏目 / 猫 / 壊れる / zzz" />
      <p className="hint">
        「壊れる」と入れると HTTP 500(エラー状態)、「zzz」なら 0件(空状態)、
        空欄なら全件。応答は 500ms 遅らせてあるので「読み込み中」が見えます。
      </p>

      {state.status === "loading" && <p className="muted">読み込み中...</p>}
      {state.status === "error" && <p className="error" role="alert">読み込みに失敗しました: {state.message}</p>}
      {state.status === "empty" && <p className="muted">該当する本はありません</p>}
      {state.status === "success" && (
        <ul>
          {state.books.map((b) => (
            <li key={b.id}>
              {b.title}({b.author}){b.stock === 0 && <strong>【品切れ】</strong>}
            </li>
          ))}
        </ul>
      )}

      <p className="hint">
        ▼ 試してみる: 開発者ツールのコンソールに [fakeFetch] のログが
        StrictMode のせいで2回出ることを確認。次に useEffect の依存配列を
        [q] から [] に変えて、検索語を変えても結果が変わらなくなることを確認。
      </p>
    </section>
  );
}

// =====================================================================
// いちばん外側のコンポーネント。部品を並べるだけ。
// =====================================================================
export function App() {
  return (
    <main>
      <h1>unit07 プレビュー: Reactで一覧画面を作る</h1>
      <p className="hint">
        このページは lesson/01〜05 の内容をブラウザで触るためのものです。
        採点はありません。壊して直して確かめてください。
      </p>
      <Concept1 />
      <Concept2 />
      <Concept3 />
      <Concept45 />
    </main>
  );
}
