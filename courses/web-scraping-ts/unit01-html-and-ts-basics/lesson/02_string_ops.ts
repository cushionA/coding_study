/* =====================================================================
 * 概念2: 文字列操作 — indexOf+slice / trim / split で「切り出す」
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ネットから取ってきた文字列は、前後に改行や空白がベッタリ付いていたり、
 *   "営業時間: 10:00-20:00" のようにラベルと値がくっついていたりします。
 *   実務では「この汚れた文字列から値だけ抜く」処理を延々と書きます。
 *   ここが解析([2])の心臓部で、cheerio が内部でやっていることの正体です。
 *
 * ■ 解説:
 *   TypeScript の文字列は、C# の string とほぼ同名のメソッドを持っています。
 *   今日使う4つ:
 *
 *     TypeScript        何をする                          C# の対応
 *     s.trim()          前後の空白・改行を除去              s.Trim()
 *     s.indexOf(x)      x が最初に現れる位置(なければ -1)  s.IndexOf(x)
 *     s.slice(a, b)     a文字目から b文字目の「手前」まで    s.Substring(a, b-a)
 *     s.split(sep)      sep で区切って配列にする            s.Split(sep)
 *
 *   slice(a, b) が一番の新顔です。b は「含まない」— 開始位置と終了位置を書きます
 *   (C# の Substring(開始, 長さ) が「長さ」を書くのと違う点に注意)。
 *
 *   タグの中身を切り出す定石:
 *     1. <h1> の位置を indexOf で探す → その「直後」からが中身
 *     2. </h1> の位置を indexOf で探す → その「直前」までが中身
 *     3. s.slice(中身の開始, 中身の終了) で切り出す
 *
 *   split は "a, b, c".split(",") → ["a", " b", " c"] のように配列化します
 *   (各要素に空白が残る点は後で trim で掃除。これは概念3で map と組み合わせます)。
 *
 *   TS固有の注意: split は常に「全ての区切り」で分割し、C# の Split(sep, count) の
 *   ように分割回数を制限できません。"10:00-20:00".split(":") は ["10","00-20","00"]
 *   と3つに割れてしまう。「最初のコロンだけで区切りたい」ときは一工夫が要ります
 *   (下の「見る」で扱います)。
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

// スタッフのプロフィールカード(演習の data/profile_card.html の縮小版)
const PROFILE_CARD = `<div class="profile-card">
    <h2 class="name">名前: 佐藤 涼太</h2>
    <p class="job">職業: 選書担当</p>
    <p class="tags">タグ: 文芸, 海外文学, 新刊</p>
</div>`;

// --- 見る(worked example) ---------------------------------------------
// GOAL: <h2> タグの中身「名前: 佐藤 涼太」を indexOf と slice だけで抜き出す

// STEP 1: 開始タグの位置を探し、その「直後」を中身の開始位置にする。
//         位置 + タグの長さ で、タグの終わりの次に移動できる。
const startTag = '<h2 class="name">';
const start = PROFILE_CARD.indexOf(startTag) + startTag.length;
console.log("--- STEP 1 --- 中身の開始位置:", start);

// STEP 2: 終了タグの位置 = 中身の終了位置。
//         indexOf の第2引数は「どこから探し始めるか」の開始位置(C# の IndexOf(x, start))。
//         start 以降で探すことで、確実に開始タグより後ろの </h2> を見つける。
const end = PROFILE_CARD.indexOf("</h2>", start);
console.log("--- STEP 2 --- 中身の終了位置:", end);

// STEP 3: slice で切り出す(end は「含まない」ので </h2> 自体は入らない)。
const nameLine = PROFILE_CARD.slice(start, end);
console.log("--- STEP 3 --- 抜き出した中身:", JSON.stringify(nameLine));

// STEP 4: trim と split の動きも見ておく。
const raw = "  文芸, 海外文学, 新刊  ";
console.log("--- STEP 4 ---");
console.log("trim前:", JSON.stringify(raw));
console.log("trim後:", JSON.stringify(raw.trim()));
console.log("splitで分割:", raw.trim().split(","));  // 各要素にまだ空白が残る

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは "営業時間: 10:00-20:00" から「値の側」だけを取り出します。
// split(":") だと時刻の中の : でもバラバラに割れてしまうので、
// 「最初の : の位置を indexOf で探し、その直後から slice する」方法を使います。
// 実行する前に予測: 取り出される値(trim後)は何になるでしょう?
//   時刻の 10:00 の : で割れないことを確認してください。
console.log("--- 予測してみよう ---");
const line = "営業時間: 10:00-20:00";
const colon = line.indexOf(":");                 // 最初の : の位置
const value = line.slice(colon + 1).trim();      // : の直後から末尾まで(第2引数省略=末尾まで)
console.log("値の側:", JSON.stringify(value));

// --- 変えてみる ---------------------------------------------------------
// 参考までに split(":") だと時刻でどう割れるか見ておく(なぜ indexOf+slice を使うかの理由)。
console.log("--- 変えてみる ---");
console.log('split(":") の結果:', line.split(":"));  // ["営業時間", " 10", "00-20", "00"] と割れすぎる

// --- 書いてみる ---------------------------------------------------------
// 課題: PROFILE_CARD から <h2 class="name"> タグの中身(見る STEP 1-3 と同じ)を
//       切り出し、さらに "名前: " の部分を取り除いて「名前だけ」を result2 に
//       入れてください(期待値: "佐藤 涼太")。
// ヒント(概念レベル):
//   (1) 見る STEP 1-3 で nameLine("名前: 佐藤 涼太")の切り出しはできている
//   (2) 最初の ":" を indexOf で探し、その直後から slice して trim する(予測ブロックと同じ形)
let result2: string | null = null;
// ここに書く(result2 に代入する。まず中身を切り出し、次に "名前: " を取り除く)
result2 = nameLine.split(":")[1].trim();

check("概念2: 値の切り出し", result2, "佐藤 涼太",
  '切り出した文字列に対して、colon = s.indexOf(":") → s.slice(colon + 1).trim() で "名前: " が落ちる');

export {};
