/* =====================================================================
 * 概念5: ローディング / エラー / 空 / 成功 — 4状態を「型」で表現する
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念4で取得はできました。しかし実務の一覧画面が返す顔は1つではありません。
 *
 *       ① 読み込み中   … サーバの応答待ち
 *       ② エラー       … 通信断・500・想定外のレスポンス
 *       ③ 空(0件)     … 通信は成功したが、条件に合うデータが無い
 *       ④ 成功(1件以上)… 一覧を描く
 *
 *   このうち ③ を忘れた画面は「真っ白で何も起きない」と報告され、
 *   ② を忘れた画面は「ずっとぐるぐる回っている」と報告されます。
 *   どちらもフロントエンドの不具合票の常連です。
 *   今日は「忘れようがない形」= 型で4状態を表現する設計を作ります。
 *   unit08 の検索UIは、この型の上に組み立てます。
 *
 * ■ 解説:
 *
 *   ● やりがちな設計(boolean の寄せ集め)とその欠陥
 *
 *         const [loading, setLoading] = useState(true);
 *         const [error, setError] = useState<string | null>(null);
 *         const [books, setBooks] = useState<Book[]>([]);
 *
 *     一見ふつうですが、この3つの組み合わせは 2 × 2 × n 通りあり、その中には
 *     **絶対に存在してはいけない状態** が混ざっています:
 *       ・loading=true なのに error あり(読み込み中で、かつ失敗?)
 *       ・error あり なのに books も入っている(失敗したのにデータがある?)
 *       ・loading=false, error=null, books=[] … これは「空」? それとも
 *         「まだ取得を始めていない」? **区別がつきません**
 *     そして描画側は if を3つ重ねることになり、順番を間違えた瞬間に破綻します。
 *
 *   ● 解決: 直和型(判別可能なユニオン型)で「ありえない状態を作れなくする」
 *
 *         type ViewState =
 *           | { status: "loading" }
 *           | { status: "error";   message: string }
 *           | { status: "empty" }
 *           | { status: "success"; books: Book[] };
 *
 *     状態はこの4つのうち **ちょうど1つ**。しかも
 *     「error のときだけ message がある」「success のときだけ books がある」
 *     という対応が型で保証されます。status を見て分岐すれば、その枝の中では
 *     TypeScript が自動的に型を絞り込んでくれます(型の絞り込み = narrowing)。
 *
 *         if (state.status === "error") console.log(state.message); // ○ 見える
 *         if (state.status === "loading") console.log(state.message); // ✕ コンパイルエラー
 *
 *     C# アナロジー: 抽象 record + 派生 record + switch 式のパターンマッチ。
 *
 *         public abstract record ViewState;
 *         public sealed record Loading() : ViewState;
 *         public sealed record Error(string Message) : ViewState;
 *         public sealed record Empty() : ViewState;
 *         public sealed record Success(IReadOnlyList<Book> Books) : ViewState;
 *
 *         var text = state switch {
 *             Loading      => "読み込み中",
 *             Error e      => $"失敗: {e.Message}",
 *             Empty        => "0件",
 *             Success s    => $"{s.Books.Count}件",
 *         };
 *
 *     TypeScript には継承が要らず、共通のリテラル型フィールド(ここでは status)を
 *     持たせるだけで同じことができます。この目印のフィールドを **判別子(discriminant)**
 *     と呼びます。実務では status / kind / type という名前がよく使われます。
 *
 *   ● 網羅性チェック(C# の switch 式の網羅性検査に相当)
 *     状態を1つ足したのに描画側の分岐を足し忘れる、を防ぐ仕掛け:
 *
 *         function assertNever(x: never): never {
 *           throw new Error(`未処理の状態: ${JSON.stringify(x)}`);
 *         }
 *         // すべての分岐を書き切ったあとの末尾に置く
 *         return assertNever(state);
 *
 *     すべての枝を処理しきっていれば、そこに到達した state の型は never に
 *     なります。処理し忘れた枝があると never にならず、**コンパイルエラー**
 *     になって気づけます。「型を1行足したら、直すべき場所を全部コンパイラが
 *     教えてくれる」という、C# の網羅的 switch 式と同じ安心感です。
 *
 *   ● カスタムフック — 取得ロジックを画面から切り出す
 *     use で始まる名前の、フックを内部で使うただの関数を「カスタムフック」と呼びます。
 *
 *         function useBooks(q: string, doFetch: Fetcher): ViewState { ... }
 *
 *     コンポーネント側は「どう取ってくるか」を知らず、状態だけ受け取って描画に
 *     専念できます。unit06 の route / service / repository の層分離と同じ考え方を、
 *     UI 側でやっているだけです(画面 = route、フック = service)。
 *     規則: フック(useState / useEffect / 自作フック)はコンポーネントか
 *     別のフックの **トップレベル** でのみ呼ぶ。if や for やコールバックの中で
 *     呼んではいけません(React は呼ばれた順番で state を対応づけているため)。
 *
 *   ● 忘れてはいけない: fetch は 4xx/5xx で例外を投げない
 *     unit01/02 で見たとおり、fetch が reject するのは「ネットワークに届かなかった」
 *     ときだけです。500 が返ってきても Promise は成功します。
 *     **res.ok を見て自分で error 状態に落とす** のはあなたの仕事です。
 * ===================================================================== */

import "./_dom.js";
import { useEffect, useState, type ReactElement } from "react";
import { render, screen, cleanup, act } from "@testing-library/react";

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
async function settle(ms = 80): Promise<void> {
  await act(async () => { await sleep(ms); });
}
function mount(element: ReactElement): HTMLElement | null {
  cleanup();
  try {
    return render(element).container;
  } catch (e) {
    console.log(`  (描画中に例外: ${(e as Error).message})`);
    return null;
  }
}
function liTexts(): string[] {
  return screen.queryAllByRole("listitem").map((li) => li.textContent ?? "");
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 4状態をユニオン型で表し、取得ロジックをカスタムフックに閉じ込め、
//       同じコンポーネントが状況に応じて4つの顔を出すのを確認する。

type Book = { id: number; title: string };

// STEP 0: 偽サーバ。q によって「成功 / 0件 / 500 / 通信断」を出し分ける。
type Fetcher = (url: string) => Promise<Response>;

const CATALOG: Book[] = [
  { id: 11, title: "吾輩は猫である" },
  { id: 12, title: "猫町" },
  { id: 21, title: "走れメロス" },
];

const fakeFetch: Fetcher = async (url) => {
  const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
  await sleep(10);
  if (q === "落ちる") throw new TypeError("fetch failed"); // ネットワーク断は例外
  if (q === "壊れる") return new Response("boom", { status: 500 });  // ← 例外にはならない!
  const items = CATALOG.filter((b) => b.title.includes(q));
  return new Response(JSON.stringify({ items }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};

// STEP 1: 4状態を型で定義する。これが今日の中心。
type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; books: Book[] };

// STEP 2: 取得ロジックをカスタムフックへ。中身は概念4でやったことと同じ。
function useBooks(q: string, doFetch: Fetcher): ViewState {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" }); // 検索語が変わったら必ずローディングに戻す

    (async () => {
      try {
        const res = await doFetch(`/api/books?q=${encodeURIComponent(q)}`);
        // ★ ここが要。500 でも Promise は成功するので、自分で error に落とす
        if (!res.ok) {
          if (alive) setState({ status: "error", message: `サーバエラー (HTTP ${res.status})` });
          return;
        }
        const data = (await res.json()) as { items: Book[] };
        if (!alive) return;
        // 「成功して0件」と「成功して1件以上」をここで分ける
        setState(data.items.length === 0
          ? { status: "empty" }
          : { status: "success", books: data.items });
      } catch (e) {
        if (alive) setState({ status: "error", message: `通信できません (${(e as Error).message})` });
      }
    })();

    return () => { alive = false; };
  }, [q, doFetch]);

  return state;
}

// STEP 3: 描画側。状態ごとに早期 return する。分岐は status を見るだけ。
function assertNever(x: never): never {
  throw new Error(`未処理の状態: ${JSON.stringify(x)}`);
}

function BookPanel({ q, doFetch }: { q: string; doFetch: Fetcher }) {
  const state = useBooks(q, doFetch);

  if (state.status === "loading") return <p data-testid="panel">読み込み中...</p>;
  if (state.status === "error") {
    // この枝の中でだけ state.message が見える(型が絞り込まれている)
    return <p data-testid="panel" role="alert">読み込みに失敗しました: {state.message}</p>;
  }
  if (state.status === "empty") return <p data-testid="panel">該当する本はありません</p>;
  if (state.status === "success") {
    return (
      <ul data-testid="panel">
        {state.books.map((b) => <li key={b.id}>{b.title}</li>)}
      </ul>
    );
  }
  return assertNever(state); // ← 4枝すべて書けていれば、ここの state は never
}

// STEP 4: 同じコンポーネントに4つの顔を出させる。
const panel = () => screen.getByTestId("panel").textContent ?? "";

console.log("STEP 4-a: 成功(2件)");
mount(<BookPanel q="猫" doFetch={fakeFetch} />);
console.log("          取得前 =", JSON.stringify(panel()));
await settle();
console.log("          取得後 =", JSON.stringify(panel()), " li =", liTexts());

console.log("STEP 4-b: 空(0件)");
mount(<BookPanel q="存在しない語" doFetch={fakeFetch} />);
await settle();
console.log("          =", JSON.stringify(panel()), " li の数 =", liTexts().length);

console.log("STEP 4-c: HTTP 500");
mount(<BookPanel q="壊れる" doFetch={fakeFetch} />);
await settle();
console.log("          =", JSON.stringify(panel()));

console.log("STEP 4-d: 通信断(fetch が例外を投げる)");
mount(<BookPanel q="落ちる" doFetch={fakeFetch} />);
await settle();
console.log("          =", JSON.stringify(panel()));
//   ★ 4-c と 4-d は、どちらも画面上は「エラー」ですが原因の系統が違います。
//     4-c はサーバまで届いている(res.ok が false)。4-d は届いていない(例外)。
//     この2つを両方拾わないと「ずっと読み込み中」の画面ができあがります。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) boolean 寄せ集め方式(loading / error / books)で作った画面に
//       「0件で成功」を渡すと、何が表示される? — 下の BooleanSoup の
//       分岐の順番をよく読んでから答えてください。
//   (2) ユニオン型のオブジェクトで、成功状態から message を読もうとしたら?
//       ({ status: "success", books: [] }.message)
//       → undefined が返る? コンパイルエラー? 実行時エラー?
//   (3) ViewState に5つ目の状態 { status: "idle" } を足したのに、
//       BookPanel の分岐を足さなかったら何が起きる?
//       → 実行時に何も起きない? assertNever が投げる? コンパイルが止まる?
//   (4) res.ok を見るのをやめて、500 のレスポンスをそのまま res.json() したら?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) boolean 寄せ集め方式で「0件で成功」を描く
function BooleanSoup({ loading, error, books }: { loading: boolean; error: string | null; books: Book[] }) {
  if (loading) return <p data-testid="soup">読み込み中...</p>;
  if (error !== null) return <p data-testid="soup">エラー: {error}</p>;
  return <ul data-testid="soup">{books.map((b) => <li key={b.id}>{b.title}</li>)}</ul>;
}
mount(<BooleanSoup loading={false} error={null} books={[]} />);
console.log("変えてみる (1) 0件で成功 =",
  JSON.stringify(screen.getByTestId("soup").outerHTML));

// (2) 成功状態から message を読む(型の絞り込みが効いていることの確認)
const success: ViewState = { status: "success", books: [] };
console.log("変えてみる (2) 成功状態から message を読む =",
  JSON.stringify((success as { message?: string }).message));
//   ↑ as で無理やり読んでいます。as を外すと TypeScript が
//     「Property 'message' does not exist on type ...」で止めてくれます。

// (3) 分岐を書き忘れた状態を、assertNever に到達させてみる
try {
  // 本来 ViewState に無い状態を無理やり渡す(= 分岐の書き忘れと同じ状況)
  assertNever({ status: "idle" } as never);
} catch (e) {
  console.log("変えてみる (3) assertNever に到達 =", (e as Error).message);
}

// (4) res.ok を見ずに 500 のレスポンスを json() する
try {
  const res = await fakeFetch("/api/books?q=壊れる");
  console.log("変えてみる (4) 500 でも res は取れる: ok =", res.ok, " status =", res.status);
  await res.json();
  console.log("               json() 成功(ここには来ないはず)");
} catch (e) {
  console.log("               json() で失敗 =", (e as Error).constructor.name);
}

//   ※ (1) 出力は <ul data-testid="soup"></ul> — **空の <ul>**、つまり真っ白な画面です。
//     「該当0件です」と伝える枝がどこにも無いので、ユーザーには壊れて見えます。
//     boolean 方式はこの穴に気づく仕掛けがありません。
//   ※ (2) 実行時は undefined です。危険なのは「気づけないこと」。ユニオン型 + 絞り込みなら
//     as を書かない限りコンパイル時に止まります。
//   ※ (3) 「未処理の状態: {"status":"idle"}」が投げられます。実際の開発では
//     その前に **コンパイルエラー** で止まります(never に代入できない)。
//     つまり状態を1つ足したら、直すべき場所をコンパイラが列挙してくれる。
//   ※ (4) res 自体は普通に取れ、ok=false / status=500 です。例外は投げられません。
//     そして本文は "boom" なので json() が SyntaxError で落ちます。
//     res.ok を先に見ていれば、この読みづらい例外の代わりに
//     「サーバエラー (HTTP 500)」という人間向けの表示にできます。

// --- 書いてみる ---------------------------------------------------------
// 課題: ViewState を受け取って4状態を出し分ける BooksView を完成させてください。
//   ・{ status: "loading" }  → <p>読み込み中...</p>
//   ・{ status: "error", message } → <p>読み込みに失敗しました: {message}</p>
//   ・{ status: "empty" }    → <p>該当する本はありません</p>
//   ・{ status: "success", books } → <ul> の中に本ごとの <li>(key は id、文字はタイトル)
//   ※ 分岐は status を見て行うこと。文字は上の指定どおり(全角の三点リーダではなく
//     半角ピリオド3つ「...」、コロンは半角+半角スペース)。
// ヒント(概念レベル): 早期 return を4つ並べるのがいちばん読みやすい。
//   success の枝の中でだけ books が見えます(型の絞り込み)。

function BooksView({ state }: { state: ViewState }) {
  // ここに書く(status を見て4つの JSX を出し分ける)
  void state;
  return null; // ← この行を書き換える
}

// 判定用の道具(書き換え不要)
function textFor(state: ViewState): string {
  const c = mount(<BooksView state={state} />);
  return c === null ? "(描画で例外)" : (c.textContent === "" ? "(何も描かれていない)" : c.textContent ?? "");
}

const loadingText = textFor({ status: "loading" });
const errorText = textFor({ status: "error", message: "サーバエラー (HTTP 500)" });
const emptyText = textFor({ status: "empty" });
mount(<BooksView state={{ status: "success", books: CATALOG }} />);
const successItems = liTexts();

const result1: { loading: string; error: string; empty: string; success: string[] } | null = {
  loading: loadingText, error: errorText, empty: emptyText, success: successItems,
};

check("概念5: 4状態を型で出し分ける", result1,
  {
    loading: "読み込み中...",
    error: "読み込みに失敗しました: サーバエラー (HTTP 500)",
    empty: "該当する本はありません",
    success: ["吾輩は猫である", "猫町", "走れメロス"],
  },
  "全部「(何も描かれていない)」→ まだ return null のまま(未記入)。" +
  "loading だけ合って他が同じ文字 → 分岐が1本しか無い(status ごとに4本必要)。" +
  "error の文字がずれる → 「読み込みに失敗しました: 」のあとに {state.message} を" +
  "そのまま埋め込む(コロンは半角、そのあとに半角スペース1つ)。" +
  "empty のときに空の <ul> が出て \"(何も描かれていない)\" になる → " +
  "status === \"empty\" の枝を books.length で判定していないか確認(status で分岐する)。" +
  "success が [] → <li> を map で作れていない。success が [\"11吾輩は猫である\"] のように" +
  "id が混ざる → <li> に id を表示してしまっている(タイトルだけ)。" +
  "「未処理の状態」という例外 → 4つの status のどれかの枝が抜けている。");

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・命令的UI(WinForms/WPF のコードビハインド)と宣言的UI(React)の違いを、
 *   後輩に説明するつもりで:
 * ・「state を直接いじってはいけない」のはなぜか:
 * ・key に index を渡すと何が壊れるか:
 * ・useEffect の後片付け(cleanup)を書かないと、どんな不具合として現れるか:
 * ・難しかったこと / まだ腑に落ちていないこと:
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */

/* =====================================================================
 * まとめと次へ
 * ---------------------------------------------------------------------
 * 概念                  一言で                                      C# で言うと
 * 宣言的UI              画面を掴んで書き換えず、「今のデータなら      WPF の XAML +
 *                       画面はこう」という式を書く。差分反映は        データバインディング +
 *                       React の仕事                                 INotifyPropertyChanged
 * 関数コンポーネント    props を受け取り JSX を返すだけの関数。       コンストラクタ引数 +
 *                       名前は必ず大文字始まり                        init 専用プロパティを
 *                                                                    持つ record
 * JSX                   HTML ではなく式。{type, props} のオブジェクト。 設計図オブジェクトを
 *                       class→className / for→htmlFor / {} は式1つ    返すファクトリ
 * props                 読み取り専用の入力。書き換えない              record の init プロパティ
 * useState              [値, 更新関数]。値はその回のスナップショット。 プロパティ setter の中の
 *                       同一ハンドラ内で2回更新するなら              OnPropertyChanged()
 *                       setX(prev => ...) 形式
 * 不変更新              push / 直接代入は禁止。[...prev, x] /         record の with 式
 *                       {...prev, k: v} で新しい値を作る             / Append().ToList()
 * イベント              onClick={handler}(呼ばずに渡す)。          button.Click += Handler
 *                       制御コンポーネントは value + onChange の一周
 * map と key            一覧は配列を map して要素の配列に。          ItemsControl の
 *                       key は「何番目か」ではなく「どのデータか」。  コンテナ同定 /
 *                       index を渡すと入力やチェックが別の行に残る    EF Core の主キー追跡
 * 条件描画              三項演算子 / && / 早期 return。              switch 式
 *                       && の左辺は必ず boolean(0 は描画される)
 * useEffect             描画後に走る副作用。依存配列が再実行の条件。  Loaded / OnNavigatedTo
 *                       戻り値の cleanup が「次の実行前」と
 *                       「消えるとき」に走る
 * キャンセル            AbortController + alive フラグの二段構え。   CancellationTokenSource
 *                       競合状態(古い応答が新しい応答を上書き)を防ぐ + Token
 * StrictMode            開発時だけ effect を2回走らせる抜き打ち検査。 —
 *                       cleanup が正しければ結果は変わらない
 * 4状態の型             loading / error / empty / success の         抽象 record + 派生 record
 *                       判別可能なユニオン。ありえない組み合わせを     + 網羅的 switch 式
 *                       作れなくする。assertNever で網羅性を強制
 * カスタムフック        use で始まる関数に取得ロジックを閉じ込め、    Controller と Service の
 *                       画面は状態を受け取って描くだけにする          分離
 *
 * ブラウザで本物を見る(任意・強く推奨):
 *   cwd = courses/react-bigquery-prisma/ で
 *     npx vite unit07-react-ui/preview --config vite.config.ts --port 5173
 *   → http://localhost:5173/ を開く。preview/App.tsx を編集して保存すると
 *     即座に画面が変わります。今日の5概念(props / state / 一覧と key /
 *     useEffect 取得 / 4状態)が1画面に入っています。
 *     ブラウザの開発者ツールのコンソールも開いておくと、StrictMode で
 *     effect が2回走っているログが見えます。
 *
 * この先どこで使うか:
 * ・unit08(キャップストーン)で、今日の部品を実物に繋ぎます:
 *   - 検索欄は今日の「制御コンポーネント」。ただし1文字打つたびに API を
 *     叩くと重いので、useEffect + setTimeout + cleanup で **デバウンス**
 *     (打ち終わってから投げる)を自作します。cleanup を今日理解したのは
 *     そのための伏線です。
 *   - 取得先は fake fetch ではなく、unit06 で作った Express の
 *     GET /api/books。開発中はポートが違う(Vite 5173 / API 3000)ので、
 *     unit06 の cors か Vite の proxy で繋ぎます。
 *   - サーバ側は Prisma の部分一致検索(一覧)と BigQuery の集計(サマリ)を
 *     1レスポンスに束ね、片方が落ちても一覧は返す degrade 設計にします。
 *     画面側は今日の ViewState を拡張して、その「部分的な失敗」を表現します。
 *
 * 次: 演習へ。lesson を見ながらで OK。
 *   ex01_props_component … props で受け取って描くコンポーネント(概念1)
 *   ex02_state_events    … useState とイベントで動く画面(概念2)
 *   ex03_list_render     … map と key、条件描画(概念3)
 *   ex04_capstone        … useEffect 取得 + 4状態の一覧画面(概念4・5)
 *   テストは cwd を courses/react-bigquery-prisma/ にして:
 *     npx vitest run unit07-react-ui/tests
 * ===================================================================== */
