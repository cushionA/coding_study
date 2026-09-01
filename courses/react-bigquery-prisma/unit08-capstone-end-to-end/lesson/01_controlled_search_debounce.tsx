/* =====================================================================
 * 概念1: 制御コンポーネントで検索語を持ち、デバウンスで無駄打ちを止める
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここからはキャップストーンです。unit01〜07 で作った部品を、
 *   「外部APIから取り込み → DBに保存 → 検索API → 検索画面」という
 *   1本のアプリに繋ぎます。その入口が検索欄です。
 *
 *   検索欄は、実務でいちばん簡単に見えて、いちばん事故が多い部品です。
 *   「夏目漱石」と打つと 5 回キーを叩きます。素直に書くと 5 回 API が飛び、
 *   その先で Prisma の LIKE 検索と BigQuery の集計が 5 回走ります。
 *   ユーザーが 100 人いれば 500 回。**本人は1回検索したつもり** なのに。
 *   しかも 5 回の応答は投げた順に返ってくるとは限らないので、
 *   「夏目」の結果が「夏目漱石」の結果を上書きする競合状態(unit07 概念4)まで
 *   起きます。今日はこれを、追加ライブラリ無しで、
 *   useEffect + setTimeout + クリーンアップだけで解きます。
 *
 * ■ 解説:
 *
 *   ● 制御コンポーネント(controlled component)— 復習と、その本当の価値
 *     input の表示値を state が持ち、変更は onChange で state に戻す形です:
 *
 *         const [q, setQ] = useState("");
 *         <input value={q} onChange={(e) => setQ(e.target.value)} />
 *
 *     「画面に出ている文字」の正本(source of truth)が DOM ではなく state に
 *     なる、というのが要点です。C# の WPF で TextBox.Text に
 *     `{Binding Query, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}` を
 *     付けて、ViewModel のプロパティを正本にするのと同じ構図です。
 *
 *     value を書かずに onChange だけ書いても「検索する」ことはできます。
 *     ただしその瞬間、**プログラムから入力欄を操作できなくなります**。
 *     「クリア」ボタンで state を空にしても、input には打った文字が残ったまま。
 *     URL の ?q= から初期値を復元することもできません。
 *     下の「変えてみる (2)」で、この壊れ方を実際に見ます。
 *
 *   ● デバウンス(debounce)= 「打ち終わってから投げる」
 *     定義: 「イベントが来たらタイマーを仕掛ける。仕掛けている間に次のイベントが
 *     来たら、前のタイマーを **捨てて** 仕掛け直す。誰にも邪魔されずに
 *     指定時間が過ぎたときだけ実行する」。
 *     結果として「入力が止まって 300ms 経ったら1回だけ検索」になります。
 *
 *     似て非なるものにスロットル(throttle)があります。
 *       ・デバウンス: 静かになるまで待つ。**最後の1回** だけ効く。検索欄・自動保存向き。
 *       ・スロットル: 一定間隔で間引く。**定期的に** 効く。スクロール追従・進捗表示向き。
 *     検索欄は「途中の文字列で検索しても意味がない」のでデバウンスです。
 *
 *   ● React でのデバウンスの作法 — 「値を遅らせる」
 *     初心者がやりがちなのは、onChange の中で setTimeout を仕掛ける方法です。
 *     これは「いつ消すか」の管理が手作業になり、コンポーネントが消えた後に
 *     タイマーが発火する事故を招きます。React 流はこうです:
 *
 *         function useDebouncedValue(value: string, ms: number): string {
 *           const [debounced, setDebounced] = useState(value);
 *           useEffect(() => {
 *             const id = setTimeout(() => setDebounced(value), ms);
 *             return () => clearTimeout(id);   // ★ ここが心臓部
 *           }, [value, ms]);
 *           return debounced;
 *         }
 *
 *     読み方: 「value が変わるたびに effect が **貼り直され** る。貼り直す前に
 *     React が前回のクリーンアップ(= clearTimeout)を呼ぶ。だから
 *     打鍵が続いている間、タイマーは仕掛けては捨てられ続け、
 *     ms ミリ秒静かになったときだけ setDebounced が走る」。
 *
 *     unit07 概念4 で「cleanup は次の実行の前と、消えるときに走る」と学びました。
 *     デバウンスは、その性質だけで組み立てられています。
 *     ライブラリを入れる必要はありません(lodash.debounce は React の外の世界の
 *     道具で、React の中では effect と寿命が噛み合わずむしろ扱いにくい)。
 *
 *     C# アナロジー: 打鍵ごとに CancellationTokenSource を作り直して
 *     `await Task.Delay(300, token)` し、キャンセルされたら何もしない、
 *     あのパターンそのものです。clearTimeout が Cancel() に当たります。
 *
 *   ● 「入力用の state」と「検索用の state」を分ける
 *     この設計では state が2つになります:
 *       q         … 入力欄に出す文字(打鍵ごとに変わる)
 *       debouncedQ … API に投げる文字(静かになってから変わる)
 *     画面は q で即座に反応し、通信は debouncedQ でだけ起きる。
 *     「表示の速さ」と「通信の少なさ」を両立させる定石です。
 *
 *   ■ このファイルで使う新しい API:
 *     ・fireEvent.change(input, { target: { value } })
 *          … テスト用ライブラリの関数。「人が input に文字を打った」ことを
 *            React に伝える。実際のブラウザ操作の代わり。
 *     ・screen.getByRole("textbox") … 描かれた input を役割で探す。
 *     ・URLSearchParams / encodeURIComponent(unit02 で既出)
 *          … 検索語をクエリ文字列に安全に載せる。
 * ===================================================================== */

import "./_dom.js";
import { useEffect, useState, type ReactElement } from "react";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

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
/**
 * 時間を ms ミリ秒進める。5ms ずつ小分けに act() で包むのは、React の
 * テストモードが「act の外で起きた state 更新」をまとめて act の出口で
 * 処理してしまい、タイマーの発火順が潰れてしまうのを避けるためです
 * (学習用の計測装置の都合であって、アプリの書き方とは関係ありません)。
 */
async function settle(ms = 200, step = 5): Promise<void> {
  for (let i = 0; i < Math.ceil(ms / step); i++) {
    await act(async () => { await sleep(step); });
  }
}
function mount(element: ReactElement): void {
  cleanup();
  render(element);
}
/** 人が1文字ずつ打つのを再現する。gapMs = 打鍵の間隔。 */
async function typeText(text: string, gapMs = 20): Promise<void> {
  const input = screen.getByRole("textbox");
  for (let i = 1; i <= text.length; i++) {
    await act(async () => {
      fireEvent.change(input, { target: { value: text.slice(0, i) } });
      await sleep(gapMs);
    });
  }
}
function inputValue(): string {
  return (screen.getByRole("textbox") as HTMLInputElement).value;
}
function liTexts(): string[] {
  return screen.queryAllByRole("listitem").map((li) => li.textContent ?? "");
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 同じ「夏目漱」という3打鍵に対して、素直な実装は3回・デバウンス実装は
//       1回しかAPIを呼ばないことを、リクエストログで確認する。

type Book = { id: number; title: string; author: string };

const CATALOG: Book[] = [
  { id: 1, title: "吾輩は猫である", author: "夏目漱石" },
  { id: 2, title: "坊っちゃん", author: "夏目漱石" },
  { id: 3, title: "こころ", author: "夏目漱石" },
  { id: 4, title: "走れメロス", author: "太宰治" },
  { id: 5, title: "人間失格", author: "太宰治" },
  { id: 6, title: "羅生門", author: "芥川龍之介" },
];

// STEP 0: 偽の検索API(unit06 で作った GET /api/books の身代わり)。
//         「何回・どんな q で呼ばれたか」を記録するのが今日の観測装置。
const requestLog: string[] = [];
async function fakeSearchApi(url: string): Promise<Response> {
  const q = new URL(url, "http://localhost").searchParams.get("q") ?? "";
  requestLog.push(q);
  await sleep(5);
  const items = CATALOG.filter((b) => b.title.includes(q) || b.author.includes(q));
  return new Response(JSON.stringify({ items }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
type Fetcher = (url: string) => Promise<Response>;

// STEP 1: 素直な実装 —— 入力(q)をそのまま effect の依存に入れる
function NaiveSearch({ doFetch }: { doFetch: Fetcher }) {
  const [q, setQ] = useState("");                 // ← 制御コンポーネントの正本
  const [items, setItems] = useState<Book[]>([]);

  useEffect(() => {
    if (q === "") { setItems([]); return; }
    let alive = true;
    (async () => {
      const res = await doFetch(`/api/books?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { items: Book[] };
      if (alive) setItems(data.items);
    })();
    return () => { alive = false; };
  }, [q, doFetch]);                                // ← 打鍵のたびに再実行される

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="書名か著者" />
      <ul>{items.map((b) => <li key={b.id}>{b.title}</li>)}</ul>
    </div>
  );
}

// STEP 2: デバウンス版 —— 「値を遅らせる」カスタムフックを1枚かませるだけ
function useDebouncedValueDemo(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);   // ★ 次の打鍵で「前のタイマーを捨てる」
  }, [value, ms]);
  return debounced;
}

function DebouncedSearch({ doFetch, delay }: { doFetch: Fetcher; delay: number }) {
  const [q, setQ] = useState("");                    // 表示用(即座に変わる)
  const debouncedQ = useDebouncedValueDemo(q, delay); // 通信用(静かになってから変わる)
  const [items, setItems] = useState<Book[]>([]);

  useEffect(() => {
    if (debouncedQ === "") { setItems([]); return; }
    let alive = true;
    (async () => {
      const res = await doFetch(`/api/books?q=${encodeURIComponent(debouncedQ)}`);
      const data = (await res.json()) as { items: Book[] };
      if (alive) setItems(data.items);
    })();
    return () => { alive = false; };
  }, [debouncedQ, doFetch]);                          // ← 依存は「遅らせた値」

  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="書名か著者" />
      <ul>{items.map((b) => <li key={b.id}>{b.title}</li>)}</ul>
    </div>
  );
}

// STEP 3: 素直な実装に「夏目漱」を打つ(20ms 間隔で3打鍵)
requestLog.length = 0;
mount(<NaiveSearch doFetch={fakeSearchApi} />);
await typeText("夏目漱");
await settle();
console.log("STEP 3: 素直な実装のリクエスト =", JSON.stringify(requestLog));
console.log("        入力欄の表示 =", JSON.stringify(inputValue()), " 結果 =", liTexts().length, "件");

// STEP 4: デバウンス版(待ち 60ms)に、まったく同じ打ち方をする
requestLog.length = 0;
mount(<DebouncedSearch doFetch={fakeSearchApi} delay={60} />);
await typeText("夏目漱");
console.log("STEP 4: 打ち終わった直後のリクエスト =", JSON.stringify(requestLog), "(まだ静かになっていない)");
await settle();
console.log("STEP 4: 静かになった後のリクエスト =", JSON.stringify(requestLog));
console.log("        入力欄の表示 =", JSON.stringify(inputValue()), " 結果 =", JSON.stringify(liTexts()));
//   ★ 入力欄の表示は打鍵と同時に変わっているのに、通信は1回だけ。
//     「表示は q・通信は debouncedQ」の二段構えが効いています。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) useDebouncedValueDemo の cleanup(return () => clearTimeout(id))を
//       **消した** ら、「夏目漱」3打鍵でリクエストは何回・どんな内容になる?
//       (タイマーは3本仕掛けられ、誰も捨てない)
//   (2) デバウンス待ち 60ms に対して、打鍵の間隔を 100ms(ゆっくり)にしたら
//       リクエストは何回?
//   (3) input から value={q} を外して onChange だけ残すと、
//       「クリア」ボタンで setQ("") したとき、画面の入力欄の文字はどうなる?
//   (4) 制御コンポーネント(value あり)なら、同じクリアボタンで文字は消える?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) クリーンアップの無いデバウンス(= ただの遅延)
function useDelayedNoCleanup(value: string, ms: number): string {
  const [delayed, setDelayed] = useState(value);
  useEffect(() => {
    setTimeout(() => setDelayed(value), ms);   // clearTimeout しない
  }, [value, ms]);
  return delayed;
}
function BrokenDebouncedSearch({ doFetch, delay }: { doFetch: Fetcher; delay: number }) {
  const [q, setQ] = useState("");
  const delayedQ = useDelayedNoCleanup(q, delay);
  const [items, setItems] = useState<Book[]>([]);
  useEffect(() => {
    if (delayedQ === "") { setItems([]); return; }
    let alive = true;
    (async () => {
      const res = await doFetch(`/api/books?q=${encodeURIComponent(delayedQ)}`);
      const data = (await res.json()) as { items: Book[] };
      if (alive) setItems(data.items);
    })();
    return () => { alive = false; };
  }, [delayedQ, doFetch]);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
      <ul>{items.map((b) => <li key={b.id}>{b.title}</li>)}</ul>
    </div>
  );
}
requestLog.length = 0;
mount(<BrokenDebouncedSearch doFetch={fakeSearchApi} delay={60} />);
await typeText("夏目漱");
await settle();
console.log("変えてみる (1) cleanup 無し =", JSON.stringify(requestLog));

// (2) ゆっくり打つ(打鍵間隔 100ms > デバウンス待ち 60ms)
requestLog.length = 0;
mount(<DebouncedSearch doFetch={fakeSearchApi} delay={60} />);
await typeText("夏目漱", 100);
await settle();
console.log("変えてみる (2) ゆっくり打鍵 =", JSON.stringify(requestLog));

// (3)(4) 制御コンポーネントかどうかで「クリア」ボタンの効き方が変わる
function ClearBox({ controlled }: { controlled: boolean }) {
  const [q, setQ] = useState("");
  return (
    <div>
      {controlled
        ? <input value={q} onChange={(e) => setQ(e.target.value)} />
        : <input onChange={(e) => setQ(e.target.value)} />}
      <button onClick={() => setQ("")}>クリア</button>
      <p data-testid="state">state={q}</p>
    </div>
  );
}
const stateText = () => screen.getByTestId("state").textContent ?? "";
for (const controlled of [false, true]) {
  mount(<ClearBox controlled={controlled} />);
  await typeText("夏目");
  const afterTyping = { state: stateText(), input: inputValue() };
  await act(async () => { fireEvent.click(screen.getByRole("button")); await sleep(5); });
  console.log(`変えてみる (${controlled ? 4 : 3}) controlled=${controlled}`);
  console.log("      打った直後 :", JSON.stringify(afterTyping));
  console.log("      クリア後   :", JSON.stringify({ state: stateText(), input: inputValue() }));
}
//   ※ (1) 3回とも飛びます。しかも中身は ["夏","夏目","夏目漱"] で、返ってくる順番は
//     保証されません。「デバウンスしたつもり」でいちばん多い実装ミスがこれです。
//     効いているのは setTimeout ではなく **clearTimeout** の方だ、と覚えてください。
//   ※ (2) 3回飛びます。デバウンスは「打鍵を数える」のではなく
//     「静かな時間を測る」仕組みなので、ゆっくり打てば全部通ります。正しい動作です。
//     待ち時間は 250〜400ms が実務の相場(短すぎると効かず、長すぎると鈍く感じる)。
//   ※ (3) state は空になったのに、入力欄には「夏目」が残ります。DOM が正本に
//     なってしまっているので、React から消せません。
//   ※ (4) 両方空になります。state が正本だから、state を空にすれば画面もそうなる。
//     これが「制御コンポーネントにする」ことの実利です。

// --- 書いてみる ---------------------------------------------------------
// 課題: デバウンス用のカスタムフック useDebouncedValue を自分で書いてください。
//   ・引数: value(遅らせたい値)と ms(静かになるまでの待ち時間)
//   ・戻り値: 「value が ms ミリ秒変化しなかったときだけ追いつく値」
//   ・value か ms が変わるたびに effect を貼り直し、前回のタイマーは必ず捨てる
// ヒント(概念レベル): 状態を1つ持ち、useEffect の中でタイマーを仕掛け、
//   クリーンアップでそのタイマーを取り消す。上の解説のコード片を見ずに、
//   「cleanup は次の実行の前に走る」から逆算して組み立ててみてください。

function useDebouncedValue(value: string, ms: number): string {
  // ここに書く(useState + useEffect + setTimeout + クリーンアップ)
  void value; void ms;   // ← 未使用警告よけ。書いたら消してよい
  return "";             // ← この行を書き換える
}

// 判定用の画面(書き換え不要)。上のフックだけを使って検索する。
function SearchPanel({ doFetch, delay }: { doFetch: Fetcher; delay: number }) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, delay);
  const [items, setItems] = useState<Book[]>([]);
  useEffect(() => {
    if (debouncedQ === "") { setItems([]); return; }
    let alive = true;
    (async () => {
      const res = await doFetch(`/api/books?q=${encodeURIComponent(debouncedQ)}`);
      const data = (await res.json()) as { items: Book[] };
      if (alive) setItems(data.items);
    })();
    return () => { alive = false; };
  }, [debouncedQ, doFetch]);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
      <ul>{items.map((b) => <li key={b.id}>{b.title}</li>)}</ul>
    </div>
  );
}

requestLog.length = 0;
mount(<SearchPanel doFetch={fakeSearchApi} delay={60} />);
await typeText("夏目漱");   // 10ms 間隔で3打鍵
await settle();

const result1: { requests: string[]; input: string; items: string[] } | null = {
  requests: [...requestLog],
  input: inputValue(),
  items: liTexts(),
};

check("概念1: 自作デバウンスで検索を1回に絞る", result1,
  {
    requests: ["夏目漱"],
    input: "夏目漱",
    items: ["吾輩は猫である", "坊っちゃん", "こころ"],
  },
  "requests が [] で items も [] → まだ空文字を返している(未記入)。" +
  "requests が [\"夏\",\"夏目\",\"夏目漱\"] → value をそのまま返している" +
  "(遅らせていない)か、cleanup で clearTimeout していない。" +
  "requests が [\"\"] → 初期値ではなく空文字を返し続けている。" +
  "input が \"\" → 判定用の SearchPanel は触らないでください(フックだけが課題です)。" +
  "requests が [\"夏目\"] など途中の語 → 依存配列に value を入れ忘れて" +
  "effect が貼り直されていない。" +
  "items だけ空 → 待ち時間(ms)を長く取りすぎて、判定時にまだ応答が来ていない" +
  "(引数の ms をそのまま setTimeout に渡しているか確認)。");

cleanup();
export {};
