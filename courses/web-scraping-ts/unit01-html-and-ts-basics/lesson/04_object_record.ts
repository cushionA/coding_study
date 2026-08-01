/* =====================================================================
 * 概念4: オブジェクト / Record<K,V> — Dictionary で集計、?. と ?? で安全に扱う
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   整形([3])の最終形は、たいてい「1レコード = 1つのオブジェクト」です:
 *   { name: "佐藤 涼太", job: "選書担当" }。さらに「どのタグが何人に使われているか」
 *   のような集計も、キー→数値の対応表で数えます。CSV出力(unit05)の直前は必ず
 *   この形を経由するので、ここは全ユニット共通の合流点です。
 *
 * ■ 解説:
 *   TypeScript には2つの「連想配列」の表し方があります。
 *
 *   (A) オブジェクト型 { name: string; job: string }
 *       → キーが固定の「レコード」。C# の class や record 相当。
 *   (B) Record<string, number>
 *       → キーが動的に増える「辞書」。C# の Dictionary<string, int> 相当。
 *       Record<K, V> は「キーが K 型・値が V 型のオブジェクト」を表すジェネリック型です。
 *
 *   TS固有の落とし穴(ここが今日の山):
 *   存在しないキーにアクセスしても例外にならず undefined が返ります
 *   (C# の Dictionary は例外を投げるので逆)。そこで2つの演算子を使います
 *   — どちらも C# とまったく同じ記号・同じ意味です:
 *
 *     ??  (Null合体演算子)  a ?? b は「a が null/undefined なら b、そうでなければ a」
 *     ?.  (オプショナルチェーン) obj?.prop は「obj が null/undefined なら
 *                               undefined、そうでなければ obj.prop」
 *
 *   集計の定石(出現回数を数える)は ?? が主役:
 *     counts[tag] = (counts[tag] ?? 0) + 1;   // 無ければ 0 から、あれば +1
 *   counts[tag] は初回 undefined なので、そのまま +1 すると NaN になる。
 *   ?? 0 を挟むことで初回でも安全に 0 から数え始められます。
 * ===================================================================== */

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
// GOAL: オブジェクトでの「値の取り出し」と、Record での「出現回数の集計」を見る

// STEP 1: 1レコードをオブジェクトで表す(これが整形のゴールの形)。
//         型注釈 { name: string; job: string } で「持つべきキーと型」を宣言する。
const staff: { name: string; job: string } = { name: "佐藤 涼太", job: "選書担当" };
console.log("--- STEP 1 --- 名前:", staff.name, "/ 職業:", staff.job);

// STEP 2: 存在しないかもしれない値を ?? で安全に取り出す。
//         下の profile は job が入っていないかもしれないオブジェクト。
//         profile.job が undefined のとき ?? "不明" が返る。
const profile: { name: string; job?: string } = { name: "田中" };
console.log("--- STEP 2 --- 職業:", profile.job ?? "不明");  // "不明" が返る(例外にならない)

// STEP 3: Record<string, number> を使った出現回数の集計。
//         Record は「キー動的追加OKの辞書」。counts[tag] は初回 undefined なので
//         ?? 0 で 0 から数え始める。
const tags = ["文芸", "新刊", "文芸", "海外文学", "新刊", "文芸"];
const counts: Record<string, number> = {};
for (const tag of tags) {
  counts[tag] = (counts[tag] ?? 0) + 1;  // 無ければ 0 スタート、あれば +1
}
console.log("--- STEP 3 --- 集計結果:", counts);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、上の counts({文芸:3, 新刊:2, 海外文学:1})に対して
// ?? を使ったアクセスを2回行います。片方は存在するキー、もう片方は存在しないキー。
// 実行する前に予測: それぞれ何が表示されるでしょう?
console.log("--- 予測してみよう ---");
console.log("文芸の回数    :", counts["文芸"] ?? 0);
console.log("児童書の回数  :", counts["児童書"] ?? 0);  // 存在しないキー

// --- 変えてみる ---------------------------------------------------------
// ?. (オプショナルチェーン)の動きも見ておく。
// 下の people 配列から find で探す。見つからなければ undefined が返るので、
// その結果に対して ?.name とすると「obj が undefined なら評価をやめて undefined」。
console.log("--- 変えてみる ---");
const people: { name: string }[] = [{ name: "佐藤" }, { name: "田中" }];
const missing = people.find((p) => p.name === "鈴木");  // 居ないので undefined
console.log("missing?.name:", missing?.name);            // undefined(. で落ちない)
console.log("?? と組む    :", missing?.name ?? "名無し");  // "名無し"

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の tagLists(スタッフ2人分のタグ配列)を走査し、タグごとに何人が
//       使っているかを数えた Record を result4 に入れてください
//       (期待値: { 文芸: 2, 新刊: 1, 海外文学: 1 })。
// ヒント(概念レベル): 空の Record<string, number>({})を用意し、二重ループ
//   (for (const list of tagLists) の中で for (const tag of list))で
//   counts[tag] = (counts[tag] ?? 0) + 1 を回す。見る STEP 3 を配列の配列に広げるだけ。
const tagLists: string[][] = [["文芸", "新刊"], ["文芸", "海外文学"]];

let result4: Record<string, number> | null = null;
// ここに書く(result4 に代入する。?? を使ってタグごとの人数を集計)
result4 = {};
for(const tags of tagLists){
  for(const tag of tags){
    result4[tag] = (result4[tag] ?? 0) + 1;
  }
}

check("概念4: Record で集計", result4, { 文芸: 2, 新刊: 1, 海外文学: 1 },
  '外側 for (const list of tagLists)、内側 for (const tag of list)。counts[tag] = (counts[tag] ?? 0) + 1');

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */

/* =====================================================================
 * まとめと次へ
 * ---------------------------------------------------------------------
 * 概念            一言で                                       C#で言うと
 * 全体像/DOM      スクレイピングは 取得→解析→整形→出力。       オブジェクトグラフ
 *                 HTMLは入れ子の箱(ツリー=DOM)
 * 文字列操作      indexOf+slice で切り出し、trim/split で        IndexOf/Substring/
 *                 掃除・分割。split は分割回数を制限できない      Trim/Split
 * 配列メソッド    map(変換)/filter(絞り込み)/find(最初の1個)。   LINQ Select/Where/
 *                 (x)=>... はラムダ。find は無ければ undefined    First(OrDefault)
 * オブジェクト/   { } でレコード、Record<K,V> で辞書。            class / record /
 * Record          存在しないキーは undefined → ?? / ?. で守る    Dictionary
 *
 * この先どこで使うか:
 * ・unit02 で cheerio を使うと、今日の indexOf+slice での「タグの中身の切り出し」が
 *   $("h1").text() の一撃に置き換わります。今日わざと素朴にやったことで、
 *   この文字列処理がいかに壊れやすいか(タグの書き方が少し変わると即バグ、
 *   split がコロンで割れすぎる等)を体感したはず。その壊れやすさをライブラリが
 *   解決してくれる、というのが次の話です。
 * ・map/filter/find と Record は unit02 以降ずっと登場します(複数レコードを
 *   Array<Record<string, string>> に整形 → unit05 で CSV に書き出す)。
 *   今日の集計と ?? / ?. が、汚れた実データを守りながら整形する土台になります。
 *
 * 次: 演習 ex01_string_extract.ts へ。lesson を見ながらで OK。テストは
 *   npx vitest run unit01-html-and-ts-basics/tests/ex01.test.ts
 *   (cwd は courses/web-scraping-ts/)
 * ===================================================================== */
