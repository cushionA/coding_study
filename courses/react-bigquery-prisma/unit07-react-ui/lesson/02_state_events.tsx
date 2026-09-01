/* =====================================================================
 * 概念2: useState とイベント — 「変数を書き換える」をやめる
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念1のコンポーネントは props を表示するだけで、押しても何も起きませんでした。
 *   実務の画面はユーザー操作で変わります: 検索欄に打つ、チェックを入れる、
 *   「もっと見る」を押す。unit08 で作る検索UIも、入力のたびに画面が変わります。
 *   その「変わる部分」を React でどう表現するか — それが state です。
 *
 * ■ 解説:
 *
 *   ● なぜ普通の変数ではダメなのか
 *     コンポーネントは **ただの関数** です。React は画面を更新するたびに
 *     この関数を最初から呼び直します。だから関数の中の普通の変数は
 *     呼び出しのたびに初期値に戻ります。
 *
 *         function Counter() {
 *           let n = 0;                       // ← 呼ばれるたびに 0 に戻る
 *           return <button onClick={() => { n++; }}>{n}</button>;
 *           //     しかも n++ しても React は「変わった」と気づかないので
 *           //     関数を呼び直さない = 画面は永遠に 0 のまま
 *         }
 *
 *     必要なのは (a) 再実行をまたいで値が残ること (b) 値が変わったら
 *     React が気づいて関数を呼び直すこと。この2つを与えるのが useState です。
 *
 *   ● useState の形
 *         const [n, setN] = useState(0);
 *          └┬┘ └─┬─┘        └──┬──┘
 *           │    │             初期値。**最初の1回だけ**使われる
 *           │    更新関数。これを呼ぶと React が「再レンダリング」を予約する
 *           現在の値。読み取り専用のスナップショット
 *
 *     戻り値は [値, 更新関数] の2要素タプル。配列の分割代入で受けます
 *     (C# の out 引数や ValueTuple の分解 `var (n, setN) = ...` に近い)。
 *     名前は自由ですが、実務では [x, setX] の形で揃えます。
 *
 *     型は初期値から推論されます。推論できない/させたくないときは明示:
 *         const [q, setQ] = useState<string>("");
 *         const [sel, setSel] = useState<Book | null>(null); // ← null 始まりは明示が必要
 *
 *   ● C# アナロジー
 *     WPF の ViewModel で
 *         private int _n;
 *         public int N { get => _n; set { _n = value; OnPropertyChanged(); } }
 *     と書いたときの「setter で OnPropertyChanged を呼ぶ」部分が setN です。
 *     違いは、React では **画面全体をもう一度組み立て直して差分を取る** こと。
 *     「どのコントロールを更新するか」を人間が指定しません。
 *
 *   ● 最重要ルール: state は「書き換える」のではなく「新しい値で置き換える」
 *
 *         ✕ items.push(x); setItems(items);   // 同じ配列オブジェクトのまま
 *         ○ setItems([...items, x]);          // 新しい配列を作って渡す
 *         ✕ user.name = "新";  setUser(user);
 *         ○ setUser({ ...user, name: "新" }); // 新しいオブジェクトを作って渡す
 *
 *     理由: React は「前の値 === 新しい値」を **参照の同一性(Object.is)** で
 *     判定します。中身をいじっても参照が同じなら「変わっていない」と見なし、
 *     再レンダリングしません。C# で言えば、record を `with` 式で作り直すのに
 *     近い発想です(`user with { Name = "新" }`)。
 *     [...items, x] は C# の `items.Append(x).ToList()`、
 *     { ...user, name } は `user with { Name = name }` と読み替えてください。
 *
 *   ● イベントハンドラ
 *         <button onClick={handleClick}>追加</button>     ← 関数を **渡す**
 *         <button onClick={handleClick()}>追加</button>   ← ✕ 呼んでしまっている
 *         <button onClick={() => setN(n + 1)}>+1</button> ← 引数を渡したいなら包む
 *
 *     名前は onClick / onChange / onSubmit … と camelCase(HTML は onclick)。
 *     受け取る e は React の「合成イベント」— ブラウザ差を吸収した薄いラッパで、
 *     使い勝手はブラウザのイベントとほぼ同じ(e.target.value, e.preventDefault())。
 *     C# の `button.Click += Handler;` の Handler を渡している感覚そのままです。
 *
 *   ● 制御コンポーネント(controlled component)
 *         <input value={q} onChange={(e) => setQ(e.target.value)} />
 *     入力欄の表示内容を **state が持ち**、入力イベントで state を更新し、
 *     その結果として入力欄が描き直される、という一周を作ります。
 *     「画面が正、コードはそれを読む」(WinForms の textBox.Text)ではなく
 *     「state が正、画面はその写像」という向きに逆転します。これが React 流。
 *     value を渡したのに onChange を書かないと、入力しても文字が出ません
 *     (state が変わらない = 画面も変わらないので当然)。
 *
 *   ● 更新関数の2つの呼び方(これを外すと必ずバグる)
 *         setN(n + 1)          … 「値」を渡す。n はこの回のスナップショット
 *         setN((prev) => prev + 1) … 「前の値からの計算方法」を渡す(更新関数形式)
 *     同じハンドラ内で2回以上更新するときは必ず後者。理由は「予測」で体験します。
 * ===================================================================== */

import "./_dom.js";
import { useState, type ReactElement } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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
function mount(element: ReactElement): HTMLElement | null {
  cleanup();
  try {
    return render(element).container;
  } catch (e) {
    console.log(`  (描画中に例外: ${(e as Error).message})`);
    return null;
  }
}
//   click: 「〜と書かれたボタン」を押す。ブラウザで人がクリックするのと同じ扱い。
function click(buttonLabel: string): void {
  fireEvent.click(screen.getByRole("button", { name: buttonLabel }));
}
//   type: 入力欄に文字を打ち込む(1回でまとめて入力したことにする)。
//     aria-label で入力欄を特定する(画面上のラベル文字で探すのと同じ発想)。
function type(inputLabel: string, value: string): void {
  fireEvent.change(screen.getByLabelText(inputLabel), { target: { value } });
}
//   textOf: data-testid を付けた要素の文字列を取る(表示確認用)。
function textOf(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: state を1つ持つコンポーネントが、クリックのたびに「関数ごと呼び直されて」
//       画面が更新される様子を、レンダリング回数の実況つきで観察する。

// STEP 1: state と、それを更新するボタン。
let renderCount = 0; // 実況用。実務のコンポーネントにこんな外部変数は書きません

function Counter({ label }: { label: string }) {
  const [n, setN] = useState(0); // ← 初期値 0。この行は毎回実行されるが、
  //                                  値が保存されているのは2回目以降その値が返る
  renderCount += 1;
  console.log(`  [render #${renderCount}] Counter 関数が呼ばれた。このときの n = ${n}`);

  function handleIncrement() {
    console.log(`    [click] ハンドラ開始時の n = ${n}`);
    setN(n + 1); // 「n+1 という値」で置き換えるよう予約する
    console.log(`    [click] setN 直後の n = ${n}  ← ★ まだ変わっていない`);
  }

  return (
    <div>
      <p data-testid="out">{label}: {n}</p>
      <button onClick={handleIncrement}>ふやす</button>
      <button onClick={() => setN(0)}>リセット</button>
    </div>
  );
}

console.log("STEP 1: 初回描画");
mount(<Counter label="カウント" />);
console.log("        画面 =", JSON.stringify(textOf("out")));

console.log("STEP 2: 「ふやす」を1回押す");
click("ふやす");
console.log("        画面 =", JSON.stringify(textOf("out")));
//   ★ ハンドラの中では n は 0 のまま。それでも画面は 1 になっている。
//     n は「この回の描画のスナップショット」で、書き換わる変数ではないからです。
//     C# の ref/out のように「その場で値が変わる」ものだと思うと必ずハマります。

console.log("STEP 3: もう2回押す");
click("ふやす");
click("ふやす");
console.log("        画面 =", JSON.stringify(textOf("out")));

console.log("STEP 4: リセット(インラインのアロー関数で setN(0))");
click("リセット");
console.log("        画面 =", JSON.stringify(textOf("out")));

// STEP 5: 制御コンポーネント。入力欄の中身を state が持つ。
function SearchBox() {
  const [q, setQ] = useState("");
  return (
    <div>
      {/* label と input を htmlFor / id で結ぶ。これで「品名」と読み上げられる */}
      <label htmlFor="q">検索語</label>
      <input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
      <p data-testid="echo">入力中: {q}(長さ {q.length})</p>
    </div>
  );
}
console.log("STEP 5: 制御コンポーネント");
mount(<SearchBox />);
console.log("        初期     =", JSON.stringify(textOf("echo")));
type("検索語", "猫");
console.log("        「猫」入力 =", JSON.stringify(textOf("echo")));
type("検索語", "猫の話");
console.log("        追記後   =", JSON.stringify(textOf("echo")));
console.log("        input の value =",
  JSON.stringify((screen.getByLabelText("検索語") as HTMLInputElement).value));
//   ★ 画面の値と state が常に一致している。これが「state が正」ということ。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 1回のクリックの中で setN(n + 1) を **2回** 呼んだら、表示はいくつ増える?
//       → 2 増える? 1 しか増えない? 上の STEP 2 のログ(setN 直後も n が
//         変わっていなかったこと)をヒントに考えてください。
//   (2) 同じことを setN((prev) => prev + 1) の形で2回呼んだら?
//   (3) 配列 state に対して items.push("新") してから setItems(items) と書いたら、
//       画面の一覧は増える? 増えない?
//   (4) (3) を setItems([...items, "新"]) に変えたら?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
function TwiceCounter() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  return (
    <div>
      <p data-testid="twice">値渡し: {a} / 更新関数: {b}</p>
      <button onClick={() => { setA(a + 1); setA(a + 1); }}>値渡しで2回</button>
      <button onClick={() => { setB((p) => p + 1); setB((p) => p + 1); }}>更新関数で2回</button>
    </div>
  );
}
mount(<TwiceCounter />);
click("値渡しで2回");
click("更新関数で2回");
console.log("変えてみる (1)(2)", JSON.stringify(textOf("twice")));

function MutateVsCopy() {
  const [items, setItems] = useState<string[]>(["初期"]);
  return (
    <div>
      <p data-testid="items">{items.join(",")}(全{items.length}件)</p>
      <button onClick={() => { items.push("push"); setItems(items); }}>push して渡す</button>
      <button onClick={() => setItems([...items, "spread"])}>新しい配列を渡す</button>
    </div>
  );
}
mount(<MutateVsCopy />);
click("push して渡す");
console.log("変えてみる (3) push 後   =", JSON.stringify(textOf("items")));
click("新しい配列を渡す");
console.log("変えてみる (4) spread 後 =", JSON.stringify(textOf("items")));

//   ※ (1) 値渡しの2回呼びは **1しか増えません**。どちらの setA も、この回の
//     スナップショット a(=0)を見て「1 にして」と予約するので、後勝ちで 1。
//   ※ (2) 更新関数形式は「前の値に +1 する手順」を予約するので順に適用され 2 増えます。
//     → **同じハンドラ内で2回以上更新するなら必ず (prev) => ... を使う**。
//   ※ (3) push しても画面は増えません(表示は "初期(全1件)" のまま)。
//     配列の中身は増えているのに、参照が同じなので React が「変化なし」と判断して
//     関数を呼び直さないからです。しかも中身だけ先に汚れているので、
//     次に別の理由で再描画された瞬間に "push" が突然現れる、という最悪のバグになります。
//   ※ (4) 新しい配列を渡せば正しく再描画されます。実際 (4) の出力には (3) で
//     混入した "push" も現れます — 汚してしまった証拠です。
//     **state は絶対に直接いじらない**。これが React の鉄則です。

// --- 書いてみる ---------------------------------------------------------
// 課題: 買い物メモ ShoppingList を完成させてください。
//   ・入力欄(ラベル「品物」)に文字を打つと、その文字が state に入る
//   ・「追加」ボタンを押すと、入力中の文字が品物リスト(配列 state)の **末尾** に
//     追加され、入力欄は空に戻る
//   ・data-testid="items" の <p> には、品物を " / " でつないだ文字列を表示する
//     (例: 2件入れたら  牛乳 / 卵  と表示される。配列の join を使う)
// ヒント(概念レベル): state は2つ必要(入力中の文字 / 追加済みの配列)。
//   入力欄は value と onChange の両方をつなぐ。追加時は新しい配列を作って渡す。

function ShoppingList() {
  // ここに書く(1): useState を2つ用意する(入力中の文字 / 品物の配列)

  function handleAdd() {
    // ここに書く(3): 品物を配列の末尾に追加し、入力欄の state を空文字に戻す
  }

  return (
    <div>
      <label htmlFor="item">品物</label>
      {/* ここに書く(2): value を「入力中の文字」の state に、
          onChange を「その文字を state に入れる」ハンドラに差し替える */}
      <input id="item" value={""} onChange={() => { /* TODO */ }} />
      <button onClick={handleAdd}>追加</button>
      {/* ここに書く(4): 配列を " / " でつないだ文字列を表示する */}
      <p data-testid="items">{""}</p>
    </div>
  );
}

let result1: { items: string; inputAfter: string } | null = null;
if (mount(<ShoppingList />) !== null) {
  try {
    type("品物", "牛乳");
    click("追加");
    type("品物", "卵");
    click("追加");
    result1 = {
      items: textOf("items"),
      inputAfter: (screen.getByLabelText("品物") as HTMLInputElement).value,
    };
  } catch (e) {
    console.log(`  (操作中に例外: ${(e as Error).message})`);
  }
}

check("概念2: state とイベントで画面を変える", result1,
  { items: "牛乳 / 卵", inputAfter: "" },
  "実際が null → 描画か操作で例外(上の行にメッセージが出ています)。" +
  "items が \"\" のまま → 未記入、または表示部分 {\"\"} を配列の join に差し替えていない。" +
  "items が \"卵\" だけ → 追加のたびに配列を作り直さず上書きしている([...prev, x] の形に)。" +
  "items が \" / \" や \"牛乳 /  / 卵\" のようになる → join の区切りは半角スペース+スラッシュ+半角スペース。" +
  "items が \"牛乳,卵\" → join の引数を \" / \" にする。" +
  "items が \"\" のまま画面も打てない → input の value と onChange が state につながっていない。" +
  "inputAfter が \"卵\" → 追加後に入力欄の state を \"\" に戻していない。" +
  "1件目しか入らない/順序が逆 → push で直接いじっていないか、[x, ...prev] になっていないか確認。");

export {};
