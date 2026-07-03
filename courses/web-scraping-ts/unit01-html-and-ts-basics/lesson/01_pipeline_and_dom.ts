/* =====================================================================
 * 概念1: スクレイピングの全体像と、HTMLの「入れ子」構造(DOMツリー)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   スクレイピングの仕事は、Webページから欲しい情報(価格・商品名・リンク先)を
 *   機械的に集めることです。求人票の「データ収集の自動化」「Webからの情報抽出」は
 *   ほぼこれ。まず最初に「全体の地図」を頭に入れておくと、各ユニットで
 *   「今どこをやっているか」が迷子になりません。
 *
 * ■ 解説:
 *   スクレイピングは、いつも次の4工程のパイプラインです:
 *
 *     [1 取得]   →   [2 解析]        →   [3 整形]         →   [4 出力]
 *     HTTPで        HTMLの文字列から     配列やオブジェクトに    CSVなどに
 *     HTMLを        欲しい部分を          きれいに詰め直す         書き出す
 *     もらう         切り出す
 *
 *   このユニット(unit01)でやるのは主に [2 解析] と [3 整形] の素振りです。
 *   [1 取得] のHTTP通信は unit04、[4 出力] のCSVは unit05 で扱います。
 *   今は「取得済みのHTML文字列」がすでに手元にある前提で進めます。
 *
 *   HTMLは <タグ>中身</タグ> という「箱」が入れ子になったものです。
 *   C# で言えば、オブジェクトが別のオブジェクトを子として持つ
 *   「オブジェクトグラフ」そのもの:
 *
 *     html                          class Html {
 *      ├─ head                        Head head;      // 子オブジェクト
 *      │   └─ title "本の森書店"        Body body;
 *      └─ body                       }
 *          ├─ header                 class Body {
 *          │   ├─ h1 "本の森書店"        Header header;  // さらに子
 *          │   └─ p  "営業時間..."        Main   main;
 *          └─ main                   }
 *              ├─ h2 "お知らせ"
 *              ├─ p  "11月から..."
 *              └─ ul → li → a "/books"
 *
 *   親の中に子、子の中に孫。この木(ツリー)を DOM (Document Object Model)
 *   と呼びます。unit02 以降ではこの木を「オブジェクトとして」たどりますが、
 *   まず今日は、この木がただの文字列としてどう見えるかを確認します。
 * ===================================================================== */

// check ヘルパー(全 lesson ファイル共通・先頭に配置)
// 未記入(null)でも例外で止めず [NG]+ヒントを出す。
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

// このレッスンで題材にするHTML(演習の data/simple_page.html の縮小版)。
// 本物のスクレイピングでは fetch でネットから取ってきた文字列がこの変数に入る、
// と想像してください。今は「取得済みの文字列」として手元に用意しておきます。
// `String.raw` のバッククォート文字列(テンプレートリテラル)は、C# の逐語的文字列
// $@"..." のように改行をそのまま含められる複数行の文字列です。
const SIMPLE_PAGE = `<!DOCTYPE html>
<html lang="ja">
<head>
    <title>本の森書店 | お知らせ</title>
</head>
<body>
    <header>
        <h1>本の森書店</h1>
        <p>営業時間: 10:00-20:00 / 定休日: 火曜</p>
    </header>
    <main>
        <h2>お知らせ</h2>
        <p>11月から古書コーナーを2階に新設します。</p>
        <p>読書会の参加者を募集中です。</p>
        <ul>
            <li><a href="/books">蔵書一覧</a></li>
            <li><a href="/event">読書会</a></li>
            <li><a href="/access">アクセス</a></li>
        </ul>
    </main>
    <footer>
        <p>お問い合わせ: info@example-bookstore.test</p>
    </footer>
</body>
</html>`;

// --- 見る(worked example) ---------------------------------------------
// GOAL: HTMLが「タグの入れ子」でできた、ただの1本の文字列であることを目で見る

// STEP 1: SIMPLE_PAGE はただの文字列。先頭150文字を覗いてみる。
//         文字列.slice(a, b) は a文字目から b文字目の「手前」までを切り出す
//         (C# の Substring に近い。詳しくは概念2で扱う)。
console.log("--- STEP 1: 先頭150文字 ---");
console.log(SIMPLE_PAGE.slice(0, 150));

// STEP 2: 特定のタグが文字列の何文字目にあるか調べる。
//         文字列.indexOf("探す文字列") は最初に見つかった位置(先頭からの文字数)を
//         返す。見つからなければ -1(C# の string.IndexOf とまったく同じ)。
const h1Pos = SIMPLE_PAGE.indexOf("<h1>");
console.log("--- STEP 2 ---");
console.log("<h1> が現れる位置:", h1Pos);

// STEP 3: あるタグが「含まれているか」を真偽値で知りたいときは includes を使う。
//         文字列.includes("x") は x が含まれれば true(C# の string.Contains)。
console.log("--- STEP 3 ---");
console.log("<footer> を含む?:", SIMPLE_PAGE.includes("<footer>"));

// STEP 4: タグの「個数」を数える定石。TSには count メソッドが無いので、
//         "<li>" で split して「区切られた断片の数 - 1」で数える。
//         split は概念2で詳しく扱うが、ここでは「個数の数え方」として先取り。
const liCount = SIMPLE_PAGE.split("<li>").length - 1;
console.log("--- STEP 4 ---");
console.log("<li> の個数:", liCount, "(蔵書一覧/読書会/アクセスの3つ)");

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、最初の <p> の位置(indexOf)と、<p> の総数を表示します。
// 実行する前に予測: <p> はこのページに何個あるでしょう?
//   (ヒント: 営業時間・お知らせ2つ・お問い合わせ)
//   そして indexOf が返すのは「最初の1個」の位置だけであることも確認してください。
console.log("--- 予測してみよう ---");
console.log("最初の <p> の位置:", SIMPLE_PAGE.indexOf("<p>"));
console.log("<p> の総数      :", SIMPLE_PAGE.split("<p>").length - 1);

// --- 変えてみる ---------------------------------------------------------
// indexOf は「無ければ -1」を返します。存在しないタグを探すとどうなるか見ておく。
// この -1 という戻り値は、後で「見つからなかった」の判定に使います(概念2)。
console.log("--- 変えてみる ---");
console.log("<table> の位置:", SIMPLE_PAGE.indexOf("<table>"), "(無いので -1)");

// --- 書いてみる ---------------------------------------------------------
// 課題: SIMPLE_PAGE の中に `<a href=` という文字列(リンクの開始部分)が
//       何個あるかを数えて result1 に入れてください(期待値: 3。
//       蔵書一覧/読書会/アクセスの3リンク)。
// ヒント(概念レベル): STEP 4 と同じ「split して length - 1」の形。1行で書けます。
let result1: number | null = null;
// ここに書く(result1 に代入する)

check("概念1: リンクを数える", result1, 3,
  '個数は split("<a href=").length - 1 の形で数える(区切りの数 - 1)');

export {};
