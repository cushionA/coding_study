/* =====================================================================
 * 概念1: 宣言的UI・関数コンポーネント・props — 画面を「関数の戻り値」にする
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   unit06 で /api/books を返すサーバができました。今日はついに、それを
 *   人間が見る「画面」を作ります。
 *
 *       【ブラウザ (React)】 ──fetch──▶ 自前API (Express) ──▶ Prisma / BigQuery
 *        ↑ 今日ここ
 *
 *   実務のフロントエンド作業の大半は「サーバから来たデータを、決まった形の
 *   部品に流し込んで並べる」ことです。その最小単位が今日の主役 —
 *   コンポーネント(部品)と props(部品に渡す値)です。
 *
 * ■ 解説:
 *
 *   ● まず発想の転換: 命令的UI vs 宣言的UI
 *
 *     C# の WinForms / WPF コードビハインドは「命令的」です。
 *     画面上のコントロールを名前で掴んで、手で書き換える:
 *
 *         // C# (WinForms) — 命令的
 *         countLabel.Text = "3 件";                 // ← 部品を掴んで
 *         if (books.Count == 0)                     //   条件を見て
 *             emptyPanel.Visible = true;            //   手で表示を切り替え
 *         listBox.Items.Clear();                    //   手で消して
 *         foreach (var b in books) listBox.Items.Add(b.Title); //  手で詰め直す
 *
 *     この書き方の辛さは実務で必ず出会います:「どのイベントで誰がどこを
 *     書き換えたか」が散らばり、更新を1箇所書き忘れると画面とデータがズレる。
 *
 *     React は「宣言的」です。画面を掴んで書き換えるコードを **一切書きません**。
 *     代わりに「いまのデータなら画面はこういう形になるはず」という**式**を書きます:
 *
 *         // React — 宣言的
 *         function BookPanel({ books }) {
 *           return books.length === 0 ? <p>0 件</p> : <p>{books.length} 件</p>;
 *         }
 *
 *     データが変わったら React がこの関数をもう一度呼び、前回の結果と比べて
 *     **違うところだけ** DOM に反映します(差分更新)。あなたは
 *     「どう変えるか(How)」ではなく「どうあるべきか(What)」だけ書きます。
 *
 *     C# で一番近いのは WPF の XAML + データバインディング + INotifyPropertyChanged です。
 *     「ViewModel のプロパティを変えたら画面が勝手に追従する」あの感覚を、
 *     XAML ではなく **ただの関数** でやるのが React だと思ってください。
 *
 *   ● 関数コンポーネント
 *     React の部品は、ただの関数です。クラスも継承も要りません。
 *
 *         function Hello() { return <p>こんにちは</p>; }
 *
 *     規則は2つだけ:
 *       (1) **名前は大文字で始める**(後述。小文字は HTML タグ扱いになる)
 *       (2) 戻り値は「React 要素」(JSX)か null
 *
 *   ● JSX は HTML ではなく「式」
 *     <p>こんにちは</p> という見た目は HTML そっくりですが、これは
 *     TypeScript の**式**であって文字列でも HTML でもありません。
 *     ビルド時に関数呼び出しへ変換されます:
 *
 *         <p className="x">やあ</p>
 *           ↓ 変換後(概念的に)
 *         jsx("p", { className: "x", children: "やあ" })
 *
 *     つまり JSX の実体は **ただのオブジェクト**({ type, props } を持つ設計図)。
 *     C# で言えば「画面を今すぐ作る命令」ではなく「画面の設計図レコード」を
 *     返しているだけ。実際に DOM を作るのは React の仕事です。
 *     式なので、変数に入れる・配列に詰める・関数から返す、が全部できます。
 *
 *   ● JSX の書き方(HTML との差。ここでつまずく人が多い)
 *       class      → className   ( class は TS/JS の予約語なので使えない)
 *       for        → htmlFor     ( for も予約語)
 *       style="..."→ style={{ color: "red" }}  (文字列ではなくオブジェクト)
 *       {} の中は **式1つ**。if 文や for 文は書けない(文は式ではないため)
 *       閉じタグ必須。<br> は不可、<br /> と書く
 *       複数要素を返すときは1つの親で包む(<div>…</div> か <>…</>)
 *
 *   ● props(プロパティ) = 部品への入力
 *     呼び出し側が <BookCard title="坊っちゃん" pages={200} /> と書くと、
 *     コンポーネントは第1引数に { title: "坊っちゃん", pages: 200 } という
 *     **1つのオブジェクト**を受け取ります。
 *
 *     C# のアナロジー: コンストラクタ引数 + init 専用プロパティ。
 *
 *         // C#
 *         public sealed record BookCardProps(string Title, int Pages);
 *         // React (TypeScript)
 *         type BookCardProps = { title: string; pages: number };
 *         function BookCard(props: BookCardProps) { ... }
 *
 *     ★ props は **読み取り専用**です。props.title = "x" と書き換えては
 *       いけません(C# の record の init 専用プロパティと同じ気持ち)。
 *       「渡された値をもとに、返す JSX を組み立てる」だけが仕事です。
 *
 *     受け取り方は2通り。実務では分割代入がほぼ標準です:
 *         function BookCard(props: BookCardProps) { return <p>{props.title}</p>; }
 *         function BookCard({ title, pages }: BookCardProps) { return <p>{title}</p>; }
 *
 *   ● このレッスンでの「画面の見方」
 *     Node には画面がないので、jsdom で偽物のブラウザを立て(./_dom.ts)、
 *     @testing-library/react の関数で描画結果を文字列として覗きます。
 *
 *       render(<X />)   … コンポーネントを描画して DOM に入れる。
 *                         戻り値の .container が「描き込まれた入れ物の <div>」
 *       screen.getByText("坊っちゃん")
 *                       … 描画済み画面から **人間が見るのと同じ手がかり**
 *                         (文字・役割・ラベル)で要素を探す。見つからなければ例外。
 *       screen.getByRole("button", { name: "追加" })
 *                       … 「追加と書かれたボタン」を探す。実務のテストの主力。
 *       cleanup()       … 前回の描画を片付ける(次の render の前に必ず)
 *
 *     ★ ブラウザで本物を見たい人へ(任意・強く推奨):
 *         cwd = courses/react-bigquery-prisma/ で
 *           npx vite unit07-react-ui/preview --config vite.config.ts --port 5173
 *         → http://localhost:5173/ を開く。preview/App.tsx を保存すると
 *           画面が即座に更新されます(HMR)。今日の5概念が全部入っています。
 * ===================================================================== */

import "./_dom.js"; // ★ 最初に置く。React より先に document を用意する必要がある
import { createElement, type ReactElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";

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

// --- 実験用の小道具(このユニットの全レッスン共通・書き換え不要) ----------
//   mount: 前回の描画を片付けてから描画し、入れ物の <div> を返す。
//     描画中に例外が出ても **落とさず null を返す**。「書いてみる」が未記入でも
//     ファイル全体が最後まで走り切るようにするための安全装置です。
function mount(element: ReactElement): HTMLElement | null {
  cleanup();
  try {
    return render(element).container;
  } catch (e) {
    console.log(`  (描画中に例外: ${(e as Error).message})`);
    return null;
  }
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: JSX がただのオブジェクトであることを目で確認し、props 付きコンポーネントを
//       描画して、渡した値が DOM のどこに現れるかを追う。

// STEP 1: いちばん小さいコンポーネント。props なし、ただ JSX を返す関数。
function Hello() {
  return <p>こんにちは、React</p>;
}
console.log("STEP 1: 描画結果 =", mount(<Hello />)?.innerHTML);
//   ↑ <p>こんにちは、React</p> という **本物の DOM** が作られている

// STEP 2: JSX の正体を暴く。描画せずに、返ってきた値そのものを覗いてみる。
const element = <p className="title">やあ</p>;
console.log("STEP 2: JSX の型   =", typeof element);
console.log("        element.type  =", element.type);   // "p" … 何を作るか
console.log("        element.props =", JSON.stringify(element.props)); // 属性と中身
//   ★ HTML でも文字列でもなく、{ type, props } を持つ **設計図オブジェクト** です。
//     だから変数に入れられるし、配列に入れて map もできる(概念3で使います)。

// STEP 3: props を受け取るコンポーネント。型は type で先に決める。
type BookCardProps = {
  title: string;
  author: string;
  pages: number;      // 数値もそのまま渡せる(文字列に変換しなくてよい)
  isFavorite: boolean;
};

function BookCard({ title, author, pages, isFavorite }: BookCardProps) {
  // ↑ 分割代入で受け取る。C# の record を分解して使うイメージ
  return (
    <article className="book-card">
      <h2>{title}</h2>
      {/* {} の中は「式」。文字列連結も三項演算子も書ける */}
      <p className="meta">{author} / {pages}ページ</p>
      <p>{isFavorite ? "★ お気に入り" : "☆ 未登録"}</p>
    </article>
  );
}

// STEP 4: 呼び出す。文字列は "..." で、それ以外は {} で包んで渡す。
const c4 = mount(
  <BookCard title="坊っちゃん" author="夏目漱石" pages={210} isFavorite={true} />,
);
console.log("STEP 4: HTML =", c4?.innerHTML);
console.log("        テキストだけ =", JSON.stringify(c4?.textContent));

// STEP 5: 「人間が見るのと同じ手がかり」で探す。実務のテストはこの形が主力。
console.log("STEP 5: 見出しの文字 =", screen.getByRole("heading").textContent);
console.log("        メタ情報      =", screen.getByText(/ページ/).textContent);
//   ★ getByText は「その文字を含む要素」を探す。正規表現でも文字列でもよい。

// STEP 6: 同じコンポーネントを、別の props で使い回す。これが部品化の旨み。
const c6 = mount(
  <BookCard title="走れメロス" author="太宰治" pages={40} isFavorite={false} />,
);
console.log("STEP 6: 別の props =", JSON.stringify(c6?.textContent));
//   ★ 命令的UIなら「ラベルAを書き換え、ラベルBを書き換え…」ですが、
//     宣言的UIでは **入力(props)を変えて関数をもう一度呼ぶだけ** です。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に、それぞれ何が起きるか予測してメモしてください:
//   (1) className ではなく HTML と同じ class= と書いてしまったら?
//       → 無視される? そのまま出る? 例外で落ちる? 何か言われる?
//   (2) コンポーネント名を小文字にして <bookcard /> と書いたら、React は
//       「自分のコンポーネント」と「HTMLタグ」のどちらだと解釈する?
//   (3) {} の中に false / undefined / null / 0 / 空文字 を入れたら、
//       画面には何が出る? — 5つ全部が消える? 全部出る? 一部だけ出る?
//   (4) {} の中に配列 [1, 2, 3] を入れたら?
// 予測を書いてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
// (1) class と書いた場合。TypeScript の JSX 型定義に class は存在しないので、
//     普通に書くと赤線が出ます。ここでは「もし通ったらどうなるか」を見るために
//     createElement(JSX が変換された後の姿)で無理やり渡します。
const c7 = mount(createElement("p", { class: "danger" } as never, "class と書いた場合"));
console.log("変えてみる (1) class =", c7?.innerHTML);

// (2) 小文字のタグ名。<bookcard /> と書いたとき React が受け取るものと同じ。
const c8 = mount(createElement("bookcard", null, "小文字で始めた場合"));
console.log("変えてみる (2) 小文字 =", c8?.innerHTML);

// (3) いろいろな値を {} に埋め込む
const c9 = mount(<p>[{false}][{undefined}][{null}][{0}][{""}]</p>);
console.log("変えてみる (3) 値の埋め込み =", JSON.stringify(c9?.innerHTML));

// (4) 配列を埋め込む
const c10 = mount(<p>{[1, 2, 3]}</p>);
console.log("変えてみる (4) 配列 =", JSON.stringify(c10?.innerHTML));

//   ※ (1) React 19 は知らない属性もそのまま DOM に出しますが、コンソールに
//     「Invalid DOM property `class`. Did you mean `className`?」と警告します。
//     TypeScript の赤線 → React の警告、と二重の網があるので気づけます。
//   ※ (2) 「小文字で始まる名前 = HTML タグ」というのが JSX の絶対規則です。
//     だから <bookcard> という存在しないタグがそのまま DOM に作られ、
//     「unrecognized in this browser」と怒られます。**コンポーネントは必ず大文字始まり**。
//   ※ (3) false / undefined / null は **何も描かれません**(便利。概念3の条件描画の土台)。
//     一方 **0 は描かれます**。ここが実務で最悪のバグ源です:
//     {items.length && <List/>} と書くと、0 件のときに画面に "0" と出ます。
//   ※ (4) 配列は「中身を順に並べる」と解釈されます。これが概念3の map による
//     一覧描画がそのまま動く理由です。

// --- 書いてみる ---------------------------------------------------------
// 課題: 著者バッジのコンポーネント AuthorBadge を完成させてください。
//   ・props は { name: string; bookCount: number }(型は下に用意済み)
//   ・<span> を1つ返す。className は "badge"
//   ・中身の文字は  夏目漱石(全2冊)  の形。つまり  名前(全N冊)
//     ※ 全角のかっこ ( ) を使い、余分な空白を入れないこと
// ヒント(概念レベル): 分割代入で name と bookCount を受け取り、
//   1つの <span> の中に {} を2回埋め込むだけ。return を忘れずに。

type AuthorBadgeProps = { name: string; bookCount: number };

function AuthorBadge(_props: AuthorBadgeProps) {
  // ここに書く(props を使った <span> を return する)
  return null; // ← この行を、自分の JSX を返す形に書き換える
}

const c11 = mount(<AuthorBadge name="夏目漱石" bookCount={2} />);
const root11 = c11?.firstElementChild ?? null;
const result1: { tag: string; className: string; text: string } | null =
  root11 === null
    ? null
    : {
        tag: root11.tagName,
        className: root11.getAttribute("class") ?? "(class 属性なし)",
        text: root11.textContent ?? "",
      };

check("概念1: props を表示するコンポーネント", result1,
  { tag: "SPAN", className: "badge", text: "夏目漱石(全2冊)" },
  "実際が null → まだ return null のまま(未記入)。JSX を返すように書き換える。" +
  "tag が SPAN でない → <span> 以外のタグを使っている。" +
  "className が「(class 属性なし)」→ class= ではなく className=\"badge\" と書く。" +
  "text がずれる → 期待は 夏目漱石(全2冊) ちょうど。全角かっこか確認し、" +
  "JSX を複数行に折り返して余分な空白が入っていないか(1行で書くと安全)を見る。" +
  "text が 名前(全冊) のように数値だけ消える → bookCount を {} で囲み忘れている。");

export {};
