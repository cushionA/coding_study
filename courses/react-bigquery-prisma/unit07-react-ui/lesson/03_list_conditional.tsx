/* =====================================================================
 * 概念3: 一覧描画(map と key)と条件描画
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   このコースのゴールは「本の一覧画面」です。サーバから配列が返ってきて、
 *   それを行として並べる — フロントエンドで最も頻繁に書くコードがこれです。
 *   同時に、実務のバグ報告で上位に来る「並び替えたら入力内容が別の行に
 *   移った」「チェックが違う行に付いた」の原因が、今日学ぶ key です。
 *   さらに「0件のときだけメッセージを出す」のような出し分け(条件描画)も、
 *   一覧画面には必ず付いてきます。
 *
 * ■ 解説:
 *
 *   ● 配列 → 要素の配列
 *     概念1で見たとおり、JSX は式で、配列を {} に入れると中身が順に並びます。
 *     だから「配列を JSX の配列に変換する」だけで一覧が描けます。
 *
 *         <ul>
 *           {books.map((b) => <li key={b.id}>{b.title}</li>)}
 *         </ul>
 *
 *     C# で言えば `books.Select(b => ...)` そのもの(map = Select)。
 *     LINQ と違って ToList() は不要です。配列がそのまま子要素になります。
 *
 *     ★ よくある間違い: forEach を使う。forEach は undefined を返すので
 *       何も描かれません。**戻り値を作る map** を使います。
 *     ★ アロー関数を {} で囲んだら return を忘れずに:
 *         books.map((b) => { <li/> })      ← ✕ 何も返していない
 *         books.map((b) => { return <li/>; }) ← ○
 *         books.map((b) => <li/>)          ← ○(式形式。実務ではこれが多い)
 *
 *   ● key とは何か
 *     React は再レンダリングのたびに「前回の要素リスト」と「今回の要素リスト」を
 *     突き合わせて、DOM を作り直す/使い回す/捨てる を決めます。
 *     そのとき **どれとどれが同じものか** を教える目印が key です。
 *
 *         <li key={b.id}>   ← 「この行の正体は id=b.id のデータだ」という宣言
 *
 *     key は「その要素を一意に識別する、データ側の安定したID」を渡します。
 *     DB の主キー、外部APIの id、UUID など。
 *
 *     ★ key に **配列の index を渡してはいけません**(並び替え・先頭追加・削除が
 *       ある一覧の場合)。index は「何番目か」であって「どのデータか」ではないので、
 *       先頭に1件足すと全行の意味がズレます。React は「0番は0番、1番は1番」と
 *       信じて DOM を使い回すため、**入力中の文字やチェック状態が別の行に残ります**。
 *       これを実際に「変えてみる」で目撃してもらいます。
 *
 *     ★ key を書かないと React が警告を出します
 *       (Each child in a list should have a unique "key" prop.)。
 *       この警告を放置しているコードベースは、ほぼ確実に上のバグを抱えています。
 *
 *     ★ key はコンポーネントに渡る props ではありません。React が使う内部的な目印です。
 *       子の中で props.key を読もうとしても取れません(必要なら id を別途渡す)。
 *
 *     C# アナロジー: WPF の ItemsControl で、コレクション変更時にどのコンテナを
 *     どの item に対応させるかを決める同一性判定。EF Core の変更追跡が主キーで
 *     エンティティを同定するのにも似ています。「番号」ではなく「ID」で同定する。
 *
 *   ● 条件描画 — if 文は書けないので式で分岐する
 *     JSX の {} には **式** しか書けません。文である if / for は書けません。
 *     使う道具は3つ:
 *
 *       (a) 三項演算子 … 「A か B のどちらかを出す」
 *             {loading ? <Spinner /> : <List />}
 *       (b) && 演算子  … 「条件を満たすときだけ出す」
 *             {isNew && <span>NEW</span>}
 *           ※ 概念1で見たとおり false は描画されないので、条件が偽なら消える
 *       (c) 早期 return … 分岐が大きいときはコンポーネントの先頭で返してしまう
 *             if (loading) return <Spinner />;
 *
 *     ★ && の罠(実務で必ず1回はやる): **左辺を boolean にすること**。
 *         {items.length && <List />}      ← ✕ 0件のとき画面に "0" と表示される
 *         {items.length > 0 && <List />}  ← ○
 *       概念1の「0 は描画される」がここで牙を剥きます。
 *
 *   ● React Fragment
 *     複数の要素を1つにまとめたいが、余計な <div> を DOM に足したくないとき:
 *         <>  <dt>{k}</dt>  <dd>{v}</dd>  </>
 *     map の中で使うときは key を渡す必要があるので、省略記法ではなく
 *     <Fragment key={x}> と書きます。
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
function click(buttonLabel: string): void {
  fireEvent.click(screen.getByRole("button", { name: buttonLabel }));
}
//   liTexts: 画面上のリスト項目(<li>)の文字を上から順に配列で取る。
function liTexts(): string[] {
  return screen.queryAllByRole("listitem").map((li) => li.textContent ?? "");
}
//   rowMemos: 各行に置いた入力欄の中身を上から順に取る(key の実験用)。
function rowMemos(container: HTMLElement | null): string[] {
  if (container === null) return [];
  return [...container.querySelectorAll("input")].map((i) => (i as HTMLInputElement).value);
}
//   collectKeys: 「描画せずに」JSX の設計図をたどって、付いている key を集める。
//     概念1で見たとおりコンポーネントはただの関数なので、呼べば設計図が返ります。
function collectKeys(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (n === null || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const el = n as { key?: unknown; props?: { children?: unknown } };
    if ("props" in el) {
      if (el.key !== null && el.key !== undefined) out.push(String(el.key));
      walk(el.props?.children);
    }
  };
  walk(node);
  return out;
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: 配列を map で一覧にし、条件描画で「0件」「新着バッジ」を出し分ける。
//       さらに key の有無・種類で DOM の使い回され方がどう変わるかを目撃する。

type Book = { id: number; title: string; author: string; stock: number };

const BOOKS: Book[] = [
  { id: 11, title: "吾輩は猫である", author: "夏目漱石", stock: 3 },
  { id: 22, title: "坊っちゃん", author: "夏目漱石", stock: 0 },
  { id: 33, title: "走れメロス", author: "太宰治", stock: 5 },
];

// STEP 1: いちばん素直な一覧。map で <li> の配列を作る。
function TitleList({ books }: { books: Book[] }) {
  return (
    <ul>
      {books.map((b) => (
        <li key={b.id}>{b.title}</li>
      ))}
    </ul>
  );
}
mount(<TitleList books={BOOKS} />);
console.log("STEP 1: 一覧 =", liTexts());

// STEP 2: 条件描画を足す。
//   ・0件なら <ul> ごと出さずメッセージを出す(三項演算子)
//   ・在庫0の本にだけ「品切れ」を付ける(&& 演算子)
function StockList({ books }: { books: Book[] }) {
  return books.length === 0 ? (
    <p data-testid="empty">該当する本はありません</p>
  ) : (
    <ul>
      {books.map((b) => (
        <li key={b.id}>
          {b.title}({b.author})
          {b.stock === 0 && <strong>【品切れ】</strong>}
        </li>
      ))}
    </ul>
  );
}
mount(<StockList books={BOOKS} />);
console.log("STEP 2: 在庫つき =", liTexts());

// STEP 3: 同じコンポーネントに空配列を渡す。分岐のもう一方が動く。
mount(<StockList books={[]} />);
console.log("STEP 3: 0件のとき  liの数 =", liTexts().length,
  "/ メッセージ =", JSON.stringify(screen.getByTestId("empty").textContent));

// STEP 4: key を確かめる。描画せず、返ってきた設計図から key だけ抜き出す。
console.log("STEP 4: 付いている key =", collectKeys(StockList({ books: BOOKS })));
//   ★ ["11","22","33"] = データの id。「何番目か」ではなく「どのデータか」。

// STEP 5: key の効き目を体感する装置。
//   各行に「メモ欄」(state を持たない素の input)を置く。React が DOM を
//   使い回せば、そこに打った文字は残る。作り直せば消える。
type Row = { id: number; name: string };

function MemoRows({ keyMode }: { keyMode: "index" | "id" }) {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "あ" },
    { id: 2, name: "い" },
  ]);
  const [nextId, setNextId] = useState(100);
  return (
    <div>
      <button onClick={() => { setRows([{ id: nextId, name: "新" }, ...rows]); setNextId(nextId + 1); }}>
        先頭に追加
      </button>
      <ul>
        {rows.map((r, i) => (
          // ↓ ここだけが2つの実験の違い。index を渡すか、データの id を渡すか
          <li key={keyMode === "index" ? i : r.id}>
            <span>{r.name}</span>
            <input aria-label={`メモ${i}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const cIdx = mount(<MemoRows keyMode="index" />);
fireEvent.change(screen.getByLabelText("メモ0"), { target: { value: "『あ』へのメモ" } });
console.log("STEP 5: 追加前 行=", liTexts().map((t) => t.trim()), " メモ=", rowMemos(cIdx));

// --- 予測してみよう -----------------------------------------------------
// 上の STEP 5 では、1行目「あ」のメモ欄に『あ』へのメモ と打ちました。
// この状態で「先頭に追加」を押すと、行は 新 / あ / い の順になります。
// 次のブロックを実行する前に予測してください:
//   (1) key={i}(index)の場合、打った文字はどの行に残る? 新? あ? 消える?
//   (2) key={r.id}(データのID)の場合はどの行に残る?
//   (3) key を **まったく書かなかった** 場合、React は黙って動く? 何か言う?
//   (4) {books.length && <ul>...</ul>} と書いて books が空配列のとき、
//       画面には何が表示される?(概念1の「変えてみる (3)」を思い出して)
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) index を key にした状態で先頭に1件追加
click("先頭に追加");
console.log("変えてみる (1) index key : 行=", liTexts().map((t) => t.trim()), " メモ=", rowMemos(cIdx));

// (2) 同じ操作を、データの id を key にして
const cId = mount(<MemoRows keyMode="id" />);
fireEvent.change(screen.getByLabelText("メモ0"), { target: { value: "『あ』へのメモ" } });
click("先頭に追加");
console.log("変えてみる (2) id key    : 行=", liTexts().map((t) => t.trim()), " メモ=", rowMemos(cId));

// (3) key を書かない
function NoKeyList({ books }: { books: Book[] }) {
  return <ul>{books.map((b) => <li>{b.title}</li>)}</ul>;
}
console.log("変えてみる (3) key なしで描画 ↓(コンソールの警告に注目)");
mount(<NoKeyList books={BOOKS} />);
console.log("               描画自体は成功 =", liTexts());

// (4) && の左辺を boolean にしなかった場合
function BadEmpty({ books }: { books: Book[] }) {
  return <div data-testid="bad">{books.length && <ul><li>{books.length}件</li></ul>}</div>;
}
mount(<BadEmpty books={[]} />);
console.log("変えてみる (4) length && ... で0件 : 画面 =",
  JSON.stringify(screen.getByTestId("bad").textContent));

//   ※ (1) index を key にすると、メモは **「新」の行** に残ります。
//     React は「0番の <li> は0番の <li>」と見なして DOM を使い回すので、
//     中身の input(と、そこに打たれた文字)がそのまま残り、上に挿入された
//     別のデータの行に貼り付いたように見えます。実務では
//     「並び替えたらチェックが違う行に付いた」という形で報告されるバグです。
//   ※ (2) id を key にすると、メモは正しく **「あ」の行**(2行目)へ移動します。
//     React が「id=1 の行は id=1 の行」と同定できるからです。
//   ※ (3) 描画は成功しますが「Each child in a list should have a unique key prop.」
//     という警告が出ます。動いてしまうので放置されがちですが、(1) の爆弾を
//     抱えた状態です。**警告が出たら必ず直す**。
//   ※ (4) 画面に "0" と出ます。[] の length は 0 で、0 は falsy なので && は
//     0 を返し、React は **0 を描画する** ためです。
//     books.length > 0 && ... と書けば、false になって何も出ません。

// --- 書いてみる ---------------------------------------------------------
// 課題: BookList を完成させてください。
//   ・books が0件のとき: <p data-testid="empty">該当する本はありません</p> だけを返し、
//     <ul> や <li> は1つも描かない
//   ・1件以上のとき: <ul> の中に本ごとの <li> を並べる
//       - key はデータの id
//       - <li> の文字は  タイトル(著者)  の形(全角かっこ・余分な空白なし)
//       - stock が 0 の本には、そのうしろに 【品切れ】 を足す(&& を使う)
//         例: 坊っちゃん(夏目漱石)【品切れ】
// ヒント(概念レベル): 三項演算子で「0件 / それ以外」を分け、map で <li> の配列を作る。
//   条件付きの追記は {条件 && "文字"}。1行で書くと余計な空白が入りません。

function BookList({ books }: { books: Book[] }) {
  // ここに書く(0件のときと1件以上のときで、返す JSX を出し分ける)
  void books;
  return null; // ← この行を書き換える
}

// (a) 0件のとき
const cEmpty = mount(<BookList books={[]} />);
const emptyNode = cEmpty === null ? null : cEmpty.querySelector('[data-testid="empty"]');
// (b) 3件のとき
mount(<BookList books={BOOKS} />);

let keys: string[] = [];
try { keys = collectKeys(BookList({ books: BOOKS })); } catch { keys = ["(設計図を取得できず)"]; }

const result1: { emptyText: string; emptyLiCount: number; items: string[]; keys: string[] } | null =
  cEmpty === null
    ? null
    : {
        emptyText: emptyNode?.textContent ?? "(data-testid=\"empty\" の要素が無い)",
        emptyLiCount: cEmpty.querySelectorAll("li").length,
        items: liTexts(),
        keys,
      };

check("概念3: 一覧描画(map と key)と条件描画", result1,
  {
    emptyText: "該当する本はありません",
    emptyLiCount: 0,
    items: ["吾輩は猫である(夏目漱石)", "坊っちゃん(夏目漱石)【品切れ】", "走れメロス(太宰治)"],
    keys: ["11", "22", "33"],
  },
  "items が [] で emptyText も無い → まだ return null のまま(未記入)。" +
  "emptyText が「要素が無い」→ 0件のときに <p data-testid=\"empty\"> を返していない。" +
  "keys が [\"0\",\"1\",\"2\"] → key に index を渡している。b.id を渡す。" +
  "keys が [] → <li> に key を付けていない(コンソールの警告も出ているはず)。" +
  "items の文字に余分な空白が入る → JSX を複数行に折り返している。<li> の中身を1行で書く。" +
  "【品切れ】が全部の行に付く/どこにも付かない → 条件は b.stock === 0。&& の左辺は boolean に。" +
  "items が [] のまま → map ではなく forEach を使っていないか、アロー関数の {} で return を忘れていないか確認。");

export {};
