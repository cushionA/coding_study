/* =====================================================================
 * 概念4: useEffect でAPIから取ってくる — 依存配列・後片付け・キャンセル
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit06 で作った GET /api/books を、いよいよ画面から呼びます。
 *   ここが「React の入口としては最後の山」であり、実務でバグが最も多い場所です。
 *   ・検索語を変えたのに再取得されない(依存配列を間違えた)
 *   ・画面を閉じたのにレスポンスが返ってきて落ちる(後片付けをしていない)
 *   ・速い応答が遅い応答に上書きされて、古い検索結果が表示される(競合状態)
 *   これらは全部「effect の書き方」の問題です。今日ここで型を作ります。
 *
 * ■ 解説:
 *
 *   ● コンポーネントは「純粋関数」でなければならない
 *     React はコンポーネント関数を、いつ・何回呼ぶか保証しません(概念2で見たとおり
 *     更新のたびに呼び直しますし、後述の StrictMode ではわざと2回呼びます)。
 *     だから **描画のついでに副作用を起こしてはいけません**。
 *
 *         function Books() {
 *           const [items, setItems] = useState([]);
 *           fetch("/api/books").then(...);  // ✕ 呼ばれるたびに走る = 無限に叩く
 *           return <ul>...</ul>;
 *         }
 *
 *     「画面を組み立てる仕事(純粋)」と「外の世界に触る仕事(副作用)」を
 *     分ける道具が useEffect です。C# で言えば、WPF の ViewModel の
 *     プロパティ getter に HTTP 呼び出しを書かず、Loaded イベントや
 *     OnNavigatedTo に置くのと同じ発想です。
 *
 *   ● useEffect の形
 *
 *         useEffect(() => {
 *           // ① 副作用の本体。描画が DOM に反映された **あと** に実行される
 *           return () => {
 *             // ② 後片付け(cleanup)。次に①を実行する直前と、
 *             //    コンポーネントが画面から消えるときに呼ばれる
 *           };
 *         }, [dep1, dep2]);   // ③ 依存配列
 *
 *     ③ 依存配列が挙動を決めます:
 *         [ ]            … 初回の描画後に1回だけ(+ 消えるときに cleanup)
 *         [q]            … 初回 + q が前回と変わったときだけ再実行
 *         (第2引数を省略) … **毎回の描画後に実行**。中で setState すると
 *                            「更新 → 再描画 → effect → 更新 → …」の無限ループ。
 *
 *     比較は Object.is(参照の同一性)です。だから配列やオブジェクトを直接
 *     依存に入れると、中身が同じでも毎回「変わった」と判定されます
 *     (概念2の「新しい値で置き換える」の裏返し)。
 *
 *   ● 後片付け(cleanup)が必要な理由
 *     非同期の取得は「投げてから返るまで」に時間差があります。その間に
 *     ユーザーが別のページへ移動したり、検索語を変えて次の取得が始まったりします。
 *     何もしないと:
 *       ・もう画面に無いコンポーネントに対して setState する(無駄・警告・リーク)
 *       ・古い検索の結果が、新しい検索の結果を上書きする(競合状態 = race condition)
 *
 *     対策は2段構え。実務ではこの型をそのまま覚えてしまってよいです:
 *
 *         useEffect(() => {
 *           const controller = new AbortController();   // ← ①通信自体を止める
 *           let alive = true;                           // ← ②結果の反映を止める
 *           (async () => {
 *             try {
 *               const res = await fetch(url, { signal: controller.signal });
 *               const data = await res.json();
 *               if (alive) setItems(data.items);
 *             } catch (e) {
 *               if ((e as Error).name !== "AbortError" && alive) setError(...);
 *             }
 *           })();
 *           return () => { alive = false; controller.abort(); };
 *         }, [url]);
 *
 *     AbortController は unit02 のタイムアウトで出てきたものと同じ仕組みです
 *     (AbortSignal.timeout の親戚)。C# の CancellationTokenSource / CancellationToken
 *     とほぼ1対1に対応します: controller = CTS、controller.signal = Token、
 *     controller.abort() = cts.Cancel()、AbortError = OperationCanceledException。
 *     「キャンセル例外は握りつぶす」作法まで同じです。
 *
 *   ● React 19 の StrictMode — 開発中だけ effect が2回走る
 *     開発時に <StrictMode> で包むと、React は初回マウント時に
 *         effect → cleanup → effect
 *     とわざと2回実行します。嫌がらせではなく **「後片付けを書き忘れていないか」の
 *     抜き打ち検査** です。cleanup が正しければ2回走っても結果は同じになるからです。
 *     ・本番ビルドでは1回だけです
 *     ・「2回叩かれるのが嫌だから StrictMode を外す」は逆。cleanup を書くのが正解
 *     Vite の雛形は既定で <StrictMode> を付けます(preview/main.tsx も同じ)。
 *
 *   ● テストのための設計: fetch を props で受け取る
 *     unit02 でやった依存性注入を、そのままコンポーネントにも使います。
 *     コンポーネントが直接 fetch を呼ぶと、テストでネットワークが必要になります。
 *     「取ってくる関数」を props で受け取る形にしておけば、テストでは偽物を渡せます。
 *     C# の HttpClient を DI で受け取り、テストで FakeHttpMessageHandler に
 *     差し替えるのと同じ話です。
 * ===================================================================== */

import "./_dom.js";
import { useEffect, useState, StrictMode, type ReactElement } from "react";
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

//   settle: 「非同期の処理が落ち着くまで待つ」。act で包むのは、待っている間に
//     起きる state 更新を React にまとめて処理させるため(包まないと警告が出る)。
async function settle(ms = 120): Promise<void> {
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
function textOf(testId: string): string {
  const el = screen.queryByTestId(testId);
  return el === null ? "(要素が無い)" : (el.textContent ?? "");
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「検索語が変わったら取り直し、途中で用済みになった通信はキャンセルする」
//       という実務の定型を、1つずつ組み立てて動かす。

// STEP 0: unit06 の GET /api/books?q=... の代わりになる偽サーバ。
//   ・本物の fetch と同じ形(URL を受け取り Response を返す)
//   ・signal でキャンセルできる
//   ・「猫」だけわざと遅い(60ms)。あとで競合状態を作るための仕掛け
type Book = { id: number; title: string };
const ALL: Book[] = [
  { id: 11, title: "吾輩は猫である" },
  { id: 12, title: "猫町" },
  { id: 21, title: "走れメロス" },
  { id: 22, title: "斜陽" },
  { id: 23, title: "人間失格" },
];
const fetchLog: string[] = [];

function fakeFetch(url: string, init?: { signal?: AbortSignal }): Promise<Response> {
  const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
  fetchLog.push(q);
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      const items = ALL.filter((b) => b.title.includes(q));
      resolve(new Response(JSON.stringify({ total: items.length, items }), {
        status: 200, headers: { "Content-Type": "application/json" },
      }));
    }, q === "猫" ? 60 : 10); // 「猫」だけ遅い
    // キャンセルされたら、待たずに AbortError で失敗させる(本物の fetch と同じ挙動)
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
}

// STEP 1: 検索語 q が変わるたびに取り直すコンポーネント。
//   fetch そのものではなく「取ってくる関数」を props で受け取る(依存性注入)。
type BookSearchProps = { q: string; doFetch: typeof fakeFetch };

function BookSearch({ q, doFetch }: BookSearchProps) {
  const [titles, setTitles] = useState<string[] | null>(null); // null = まだ取得中

  useEffect(() => {
    console.log(`    [effect] 実行: q=${JSON.stringify(q)}`);
    const controller = new AbortController();
    let alive = true;
    setTitles(null); // 検索語が変わったら、まず「取得中」に戻す

    (async () => {
      try {
        const res = await doFetch(`/api/books?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as { items: Book[] };
        if (alive) setTitles(data.items.map((b) => b.title));
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          console.log(`    [abort ] q=${JSON.stringify(q)} の通信は用済みになったので破棄`);
          return; // キャンセルは異常ではない。握りつぶす
        }
        if (alive) setTitles([`エラー: ${(e as Error).message}`]);
      }
    })();

    return () => {
      console.log(`    [cleanup] q=${JSON.stringify(q)} の後片付け`);
      alive = false;          // ② これ以降 setTitles しない
      controller.abort();     // ① 通信自体も止める
    };
  }, [q, doFetch]); // ← q か doFetch が変わったときだけ再実行

  return <p data-testid="out">{q}: {titles === null ? "読み込み中..." : titles.join(" / ")}</p>;
}

// STEP 2: 初回マウント。まず「読み込み中」、少し待つとデータに変わる。
console.log("STEP 2: 初回マウント");
cleanup();
const view = render(<BookSearch q="猫" doFetch={fakeFetch} />);
console.log("        直後   =", JSON.stringify(textOf("out")));
await settle();
console.log("        待機後 =", JSON.stringify(textOf("out")));

// STEP 3: 検索語を変える(親から新しい props が来た、という状況)。
console.log("STEP 3: q を「斜陽」に変える → cleanup が走ってから effect が走る");
await act(async () => { view.rerender(<BookSearch q="斜陽" doFetch={fakeFetch} />); });
await settle();
console.log("        待機後 =", JSON.stringify(textOf("out")));
console.log("        これまでに叩いた q =", fetchLog);

// STEP 4: 取得の途中で画面から消す。cleanup が通信を中断する。
console.log("STEP 4: 取得中にアンマウント");
cleanup();
render(<BookSearch q="猫" doFetch={fakeFetch} />); // 猫 = 60ms かかる
await act(async () => { await sleep(10); });        // まだ返ってきていない
cleanup();                                          // ここで撤去
await settle();
console.log("        → 上に [abort] のログが出ていれば、無駄な通信を止められている");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 依存配列を **書かなかった**(第2引数を省略した)effect の中で setState したら、
//       effect は何回実行される? 1回? 2回? それとも止まらない?
//   (2) 依存配列を [] にしたまま props の q を変えたら、再取得は起きる?
//       画面の表示はどうなる?
//   (3) <StrictMode> で包んだとき、初回マウントで effect と cleanup は
//       どういう順で何回走る?
//   (4) 遅い検索(猫=60ms)を投げた直後に速い検索(斜陽=10ms)へ切り替えたとき、
//       **後片付けを書いていない** コンポーネントの画面は最終的にどうなる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) 依存配列なし + setState(安全弁つき。無いと本当に止まりません)
function NoDeps() {
  const [n, setN] = useState(0);
  useEffect(() => {
    console.log(`    [effect] 依存配列なし: n=${n} の描画のあとに実行`);
    if (n < 3) setN(n + 1); // ← この安全弁が無ければ無限ループ
  });
  return <p data-testid="nodeps">n={n}</p>;
}
console.log("変えてみる (1) 依存配列を省略");
mount(<NoDeps />);
await settle(20);
console.log("               最終 =", JSON.stringify(textOf("nodeps")));

// (2) 依存配列を [] に固定した版
function FrozenDeps({ q, doFetch }: BookSearchProps) {
  const [titles, setTitles] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await doFetch(`/api/books?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { items: Book[] };
      if (alive) setTitles(data.items.map((b) => b.title));
    })();
    return () => { alive = false; };
  }, []); // ← q を入れ忘れた、という典型的なバグ
  return <p data-testid="frozen">{q}: {titles === null ? "読み込み中..." : titles.join(" / ")}</p>;
}
console.log("変えてみる (2) 依存配列が [] のまま q を変える");
cleanup();
const v2 = render(<FrozenDeps q="猫" doFetch={fakeFetch} />);
await settle();
console.log("               q=猫   :", JSON.stringify(textOf("frozen")));
await act(async () => { v2.rerender(<FrozenDeps q="斜陽" doFetch={fakeFetch} />); });
await settle();
console.log("               q=斜陽 :", JSON.stringify(textOf("frozen")));

// (3) StrictMode
const strictLog: string[] = [];
function Probe() {
  useEffect(() => {
    strictLog.push("effect");
    // ★ cleanup は「何も返さない関数」であること。式形式のアロー関数
    //    (() => strictLog.push("cleanup"))は push の戻り値(number)を
    //    返してしまい、型エラーになります。{} で包んで文にする。
    return () => { strictLog.push("cleanup"); };
  }, []);
  return <p>probe</p>;
}
console.log("変えてみる (3) StrictMode");
mount(<Probe />);
console.log("               StrictMode なし :", strictLog.slice());
cleanup();              // 先に撤去してからログを空にする(撤去時の cleanup を数えないため)
strictLog.length = 0;
mount(<StrictMode><Probe /></StrictMode>);
console.log("               StrictMode あり :", strictLog.slice());

// (4) 後片付けを書かない版で競合状態を起こす
function NoCleanup({ q, doFetch }: BookSearchProps) {
  const [titles, setTitles] = useState<string[] | null>(null);
  useEffect(() => {
    (async () => {
      const res = await doFetch(`/api/books?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { items: Book[] };
      setTitles(data.items.map((b) => b.title)); // ← ガードなしで反映してしまう
    })();
  }, [q, doFetch]);
  return <p data-testid="race">{q}: {titles === null ? "読み込み中..." : titles.join(" / ")}</p>;
}
console.log("変えてみる (4) 後片付けなしで 猫(遅い) → 斜陽(速い) と切り替える");
cleanup();
const v4 = render(<NoCleanup q="猫" doFetch={fakeFetch} />);
await act(async () => { await sleep(5); });                                   // 猫はまだ飛行中
await act(async () => { v4.rerender(<NoCleanup q="斜陽" doFetch={fakeFetch} />); });
await settle();
console.log("               最終表示 =", JSON.stringify(textOf("race")));

//   ※ (1) effect は描画のたびに走るので、setState → 再描画 → effect → … と
//     連鎖します。安全弁で止めていますが、実務では **ブラウザが固まります**。
//     「effect の中で setState する」なら依存配列は必須だと覚えてください。
//   ※ (2) 画面の見出しは「斜陽:」に変わるのに、中身は猫の検索結果のまま。
//     見出しは props から直接描いているので更新され、一覧は effect が
//     動かないので古いまま — 一番デバッグしづらい形のバグです。
//     依存配列には「effect の中で使っている、外から来た値」を全部入れる。
//   ※ (3) StrictMode ありでは effect → cleanup → effect の3行が出ます。
//     cleanup が正しく書けていれば、2回走っても最終状態は同じになります。
//   ※ (4) 表示は「斜陽: 吾輩は猫である / 猫町」。見出しは斜陽なのに中身は猫。
//     速い方が先に届き、そのあと遅い猫の結果が **上書きした** ためです。
//     STEP 2〜3 の BookSearch は alive フラグと abort でこれを防いでいます。
//     実データでは「検索語を素早く打ち替えると結果が古いものに戻る」という
//     再現しにくい不具合になります。unit08 のデバウンス検索の土台です。

// --- 書いてみる ---------------------------------------------------------
// 課題: 検索語ごとの件数を表示する BookCounter の useEffect を完成させてください。
//   ・load(query) を呼び、返ってきた数値を count の state に入れる
//   ・query が変わったら取り直す(依存配列)
//   ・「用済みになったら反映しない」後片付けを入れる
//     (この課題の load はキャンセルに対応していないので、AbortController ではなく
//      alive フラグ方式でよい)
// ヒント(概念レベル): effect の中で async 即時実行関数を作って await し、
//   反映の直前にフラグを見る。effect の戻り値でフラグを倒す。依存配列は
//   「effect の中で使っている外部の値」を全部。

function BookCounter({ query, load }: { query: string; load: (q: string) => Promise<number> }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // ここに書く(1): load(query) の結果を setCount する(用済みなら反映しない)
    // ここに書く(2): 後片付けの関数を return する
  }, [/* ここに書く(3): 依存配列 */]);

  return <p data-testid="count">{query}: {count === null ? "読み込み中" : count}</p>;
}

// 判定用の道具(書き換え不要)
const loadLog: string[] = [];
const COUNTS: Record<string, number> = { "猫": 2, "太宰": 3 };
async function slowLoad(q: string): Promise<number> {
  loadLog.push(q);
  await sleep(q === "猫" ? 60 : 10); // 「猫」だけ遅い = 競合状態を作る
  return COUNTS[q] ?? 0;
}

let result1: { calls: string[]; finalText: string } | null = null;
try {
  cleanup();
  const v = render(<BookCounter query="猫" load={slowLoad} />);
  await act(async () => { await sleep(5); });                       // 猫は飛行中
  await act(async () => { v.rerender(<BookCounter query="太宰" load={slowLoad} />); });
  await settle(150);                                                // 両方の応答が出揃うまで待つ
  result1 = { calls: [...loadLog], finalText: textOf("count") };
} catch (e) {
  console.log(`  (実行中に例外: ${(e as Error).message})`);
}

check("概念4: useEffect による取得・依存配列・後片付け", result1,
  { calls: ["猫", "太宰"], finalText: "太宰: 3" },
  "calls が [] → effect の中で load を呼んでいない(未記入)。" +
  "calls が [\"猫\"] だけ → 依存配列に query が入っていないので取り直されていない。" +
  "calls が [\"猫\",\"太宰\",\"猫\",...] と増える → 依存配列を書き忘れている(毎描画で実行)。" +
  "finalText が \"太宰: 読み込み中\" → 結果を setCount していない、または" +
  "後片付けのフラグを常に false 扱いにしていて反映されない。" +
  "finalText が \"太宰: 2\" → 後片付けが無く、遅れて届いた猫の結果が上書きしている。" +
  "let alive = true を effect の **中** で宣言し、return () => { alive = false; } で倒すこと。" +
  "finalText が \"(要素が無い)\" → 描画で例外(上の行を確認)。");

export {};
