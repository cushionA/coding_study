/* =====================================================================
 * 概念1: APIクライアントという「境界」— TypeScript の型は実行時に消える
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   これから作る取り込みジョブは、外部APIの JSON を受け取って Prisma に保存し、
 *   BigQuery に流し、React で表示します。つまり外部APIのデータは、
 *   このアプリの端から端まで旅をします。
 *   実務で最も厄介な障害は「先方のAPIが黙って仕様を変えていた」類のものです。
 *   author が null で返ってくるようになった、price が数値から文字列になった、
 *   配列だったものが { items: [...] } で包まれるようになった。
 *   このとき、検査を1つも置いていないと **壊れた場所とエラーが出る場所が遠く離れます**。
 *   「React の画面が空白になる」→ 調べると DB の列が空 → 調べると取り込みジョブ →
 *   実は3日前の API 仕様変更、という調査に半日溶けます。
 *   だから「外から来たデータが最初に触れる場所」= APIクライアントで止めます。
 *   今日はまず、止めなかったら何が起きるかを自分の目で見ます。
 *
 * ■ 解説:
 *   ● TypeScript の型は実行時に存在しない(型消去 / type erasure)
 *     tsx や tsc が .ts を実行/変換するとき、型注釈・interface・type は
 *     **全部削り落とされて** ただの JavaScript になります。実行されているコードに
 *     「Book 型」という情報はどこにも残っていません。
 *     C# のジェネリクスは実行時にも型情報が残る(reified)ので typeof(T) や
 *     `obj is Book` が書けますが、TypeScript ではそれが原理的に不可能です。
 *
 *   ● だから `as` は「キャスト」ではなく「宣言」
 *       const books = (await res.json()) as Book[];
 *     これは C# の `(Book)obj`(失敗すると InvalidCastException が飛ぶ)ではなく、
 *     `Unsafe.As<Book>(obj)` に近い。**実行時には1バイトも検査していません**。
 *     「私が Book だと言っているのだから Book です」とコンパイラを黙らせるだけ。
 *     相手が違う形を返してきても、その場では誰も何も言いません。
 *
 *   ● 「境界の外側」という考え方
 *     自分が書いていないコードから来る値は全部「外側」です:
 *       外部APIのJSON / ユーザー入力 / 環境変数 / ファイルの中身 / DBの生の行。
 *     外側から来た値の正しい出発点は `unknown` であって `Book` ではありません。
 *     unknown は「まだ何か分からない」を表す型で、any と違って
 *     **検査を通すまで何もさせてくれません**(プロパティも読めない)。
 *     検査を通して初めて Book になる — これが概念2(zod)でやることです。
 *
 *   ● APIクライアント「モジュール」
 *     URL の組み立て・ヘッダ・ステータス判定・パース・変換といった
 *     通信の泥臭い部分を1ファイルに閉じ込め、外には
 *     「books を取ってくる関数」だけを見せる設計のことです。
 *     C# で言えば IBookApiClient(インターフェース)と BookApiClient(実装)の関係。
 *     呼び出す側は HTTP のことを何も知らなくてよくなります。
 *
 *   ● fetch は import せず「引数で受け取る」(依存性注入)
 *     クライアントの中で本物の fetch を直接呼ぶと、テストのたびに実ネットワークが
 *     必要になり、相手が落ちていたら自分のテストも落ちます。そこで
 *       type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
 *     という「fetch と同じ形の関数」型を作り、引数で受け取ります。
 *     本番では本物の fetch を、テストではダミーを渡す。C# で HttpClient を DI で
 *     注入し、テストでは HttpMessageHandler を差し替えるのと同じ発想です。
 *     unit01 の ex02 で書いた FetchLike と同じものです。
 *
 *   ■ このファイルで使う新しいAPI:
 *     ・Response.json(data, { status })
 *         … JSON ボディを持つ Response を1行で作る静的メソッド(Node 18+ 標準)。
 *           本物の fetch が返すのと同じ Response なので、.ok / .status /
 *           await .json() がそのまま使えます。ダミー応答を作るのに便利。
 *     ・new URL(url, base).pathname
 *         … URL 文字列を分解するオブジェクト。.pathname は "/books" のようなパス部分。
 *           第2引数は相対URLだったときの基準。C# の Uri クラスに相当。
 * ===================================================================== */

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

// --- 見る(worked example) ---------------------------------------------
// GOAL: `as Book[]` は実行時に何も検査していないことを、壊れた JSON を流し込んで確認する。
//       そして「壊れた場所」と「エラーが出る場所」がどれだけ離れるかを体感する。

// STEP 1: fetch の型と、テスト用のダミー fetch を用意する
//   FetchLike は「本物の fetch と同じ形をした関数」の型。これを引数で受け取る設計にする。
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

//   ルート表(パス → 返す status とボディ)から、ダミー fetch を作る小道具。
//   本物の fetch とまったく同じ使い勝手なので、呼ぶ側のコードは1文字も変わらない。
function makeFakeFetch(routes: Record<string, { status: number; body: unknown }>): FetchLike {
  return async (url) => {
    const path = new URL(url, "http://api.example.test").pathname;
    const hit = routes[path];
    if (hit === undefined) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(hit.body, { status: hit.status });
  };
}

// STEP 2: アプリ内で使いたい型と、素朴なAPIクライアント
type Book = { id: string; title: string; price: number };

//   「これが素朴な実装」— unit01 で書いたのとほぼ同じ。as で型を付けているだけ。
async function getBooksNaive(fetchFn: FetchLike, url: string): Promise<Book[]> {
  const res = await fetchFn(url);
  return (await res.json()) as Book[]; // ← 実行時には何も検査していない
}

// STEP 3: 相手がこちらの期待どおりの形を返す間は、何の問題も起きない
const okFetch = makeFakeFetch({
  "/books": {
    status: 200,
    body: [
      { id: "bk-1", title: "吾輩は猫である", price: 780 },
      { id: "bk-2", title: "銀河鉄道の夜", price: 640 },
    ],
  },
});
const goodBooks = await getBooksNaive(okFetch, "http://api.example.test/books");
console.log("STEP 3: 正常時 =", goodBooks);
console.log("STEP 3: 合計金額 =", goodBooks.reduce((sum, b) => sum + b.price, 0));

// STEP 4: ある日、先方が仕様を変えた(title → book_title、price が文字列に)
//   コードは1文字も変えていない。型エラーも出ない。実行時例外も出ない。
const changedFetch = makeFakeFetch({
  "/books": {
    status: 200,
    body: [
      { id: "bk-1", book_title: "吾輩は猫である", price: "780" },
      { id: "bk-2", book_title: "銀河鉄道の夜", price: "640" },
    ],
  },
});
const changedBooks = await getBooksNaive(changedFetch, "http://api.example.test/books");
console.log("STEP 4: 仕様変更後も例外は出ない。件数 =", changedBooks.length);
console.log("STEP 4: books[0].title =", changedBooks[0]?.title, "← undefined だが誰も止めない");
console.log("STEP 4: 合計金額 =", changedBooks.reduce((sum, b) => sum + b.price, 0),
  "← 文字列 + 数値 の連結になっている");
//   ここまで、壊れたデータはそのまま DB や画面に向かって流れていく。
//   実際にエラーとして現れるのは、ずっと後の「文字列としてしか使えない操作」に到達したとき:
try {
  console.log("STEP 4: title を大文字化してみる →", changedBooks[0]!.title.toUpperCase());
} catch (err) {
  console.log("STEP 4: ここで初めて落ちる →", (err as Error).message);
}

// STEP 5: 404 のエラーボディも、as Book[] を通れば「Book の配列」を名乗れてしまう
const missingFetch = makeFakeFetch({}); // どのパスでも 404 を返す
const notBooks = await getBooksNaive(missingFetch, "http://api.example.test/books");
console.log("STEP 5: 404 のボディ =", notBooks, "/ 配列か =", Array.isArray(notBooks));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) STEP 5 の notBooks(中身は { error: "not found" })に対して
//       notBooks.map((b) => b.title) を呼んだら何が起きる?
//       空配列が返る? undefined の配列が返る? それとも例外?
//   (2) 相手が配列をやめて { items: [...] } で包むようになった場合、
//       `as Book[]` は通る? books.length はいくつになる?
//   (3) 型注釈を Book[] と書いているのに、実行時にその約束を守らせる仕組みは
//       このコードのどこかに存在する?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
try {
  console.log("変えてみる (1):", notBooks.map((b) => b.title));
} catch (err) {
  console.log("変えてみる (1): 例外 →", (err as Error).message);
}

const wrappedFetch = makeFakeFetch({
  "/books": {
    status: 200,
    body: { items: [{ id: "bk-1", title: "吾輩は猫である", price: 780 }], total: 1 },
  },
});
const wrapped = await getBooksNaive(wrappedFetch, "http://api.example.test/books");
console.log("変えてみる (2): 中身 =", wrapped, "/ length =", wrapped.length,
  "/ 配列か =", Array.isArray(wrapped));

// (3) の答え合わせ: 「Book[] を返す」と書いた関数から、Book でないものが平然と返ってきた。
//     as も型注釈も実行時には存在しないので、約束を守らせる仕組みはどこにもありません。
//     → 自分で書くしかない。まずは手書きの最小の防御を、次の課題で作ります。

// --- 書いてみる ---------------------------------------------------------
// 課題: loadBookTitles(fetchFn, url) を完成させてください。
//       「境界で最低限やるべきこと」を手で書きます。
//       ・fetchFn(url) を await し、response.ok が false なら [] を返す(例外は投げない)
//       ・本文を await response.json() で取り出す。**それが配列でなければ [] を返す**
//       ・配列なら、要素のうち title が文字列であるものだけを選び、その title の配列を返す
//         (title が無い要素・文字列でない要素は捨てる)
// ヒント(概念レベル): 受けた値はまず unknown 扱いにして、Array.isArray と typeof で
//   絞り込んでから使う。filter で残して map で取り出す2段で書けます。
async function loadBookTitles(fetchFn: FetchLike, url: string): Promise<string[]> {
  // ここに書く(タイトルの配列を return する。書けたら下の「未実装の目印」の行は消す)
  return []; // 未実装の目印
}

//   検証用の3パターン: 正常(1件だけ壊れた要素が混ざる)/ 配列でない / 404
const mixedFetch = makeFakeFetch({
  "/books": {
    status: 200,
    body: [
      { id: "bk-1", title: "吾輩は猫である", price: 780 },
      { id: "bk-2", title: "銀河鉄道の夜", price: 640 },
      { id: "bk-3", book_title: "坊っちゃん", price: 520 }, // title が無い = 捨てる
      { id: "bk-4", title: 12345, price: 300 },             // title が文字列でない = 捨てる
    ],
  },
  "/wrapped": { status: 200, body: { items: [], total: 0 } }, // 配列ではない
  "/broken": { status: 500, body: { error: "internal" } },
});

const result1 = {
  good: await loadBookTitles(mixedFetch, "http://api.example.test/books"),
  notArray: await loadBookTitles(mixedFetch, "http://api.example.test/wrapped"),
  notOk: await loadBookTitles(mixedFetch, "http://api.example.test/broken"),
};

check("概念1: 境界で最低限の実行時チェックをする", result1,
  { good: ["吾輩は猫である", "銀河鉄道の夜"], notArray: [], notOk: [] },
  "good が [] のまま → 未実装。good に4件入る → title の型チェック(typeof === \"string\")が抜けている。" +
  "good に undefined が混ざる → filter せずに map している。" +
  "notArray が [] にならない → Array.isArray の分岐が抜けている。" +
  "notOk が [] にならない → response.ok を見ていない");

// この手書きチェックは、フィールドが3つで平坦な今日のデータだからまだ書けます。
// 入れ子・null 許容・配列の中の配列・20フィールドになった瞬間に破綻します。
// それを宣言的に書ける道具が、次のファイルの zod です。

export {};
