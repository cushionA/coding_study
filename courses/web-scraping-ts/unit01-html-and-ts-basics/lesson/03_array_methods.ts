/* =====================================================================
 * 概念3: 配列メソッド map / filter / find — LINQ の Select / Where / First
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   解析で切り出した断片は、たいてい配列のまま一括加工します:
 *   「全リンクのうち内部リンク(/始まり)だけ集める」「全タグの前後空白を掃除する」
 *   「最初に条件に合う要素を1つ取り出す」。C# の LINQ を毎日書いている人ほど、
 *   この対応を押さえると TypeScript が一気に手に馴染みます。
 *
 * ■ 解説:
 *   TypeScript の配列メソッドは、C# の LINQ にほぼ1対1で対応します。
 *   引数に渡す (x) => ... は「アロー関数」で、C# のラムダ式 x => ... と同じものです。
 *
 *     TypeScript                      何をする              C# の LINQ
 *     xs.map(x => f(x))               各要素を変換          xs.Select(x => f(x))
 *     xs.filter(x => cond(x))         条件で絞り込み         xs.Where(x => cond(x))
 *     xs.find(x => cond(x))           最初に合う1要素        xs.First(...) / FirstOrDefault
 *
 *   重要な違い(TS固有の落とし穴):
 *   find は「見つからなければ undefined を返す」。C# の FirstOrDefault に近く、
 *   例外は投げません。戻り値の型は「要素の型 | undefined」になるので、
 *   使うときは「見つからなかった場合」を意識する必要があります(概念4で ?? と組みます)。
 *
 *   その他、今日使う小物:
 *     s.length         文字列・配列の長さ(C# の .Length / .Count)
 *     s.startsWith(x)  x で始まるか(C# の StartsWith)
 *     s.toUpperCase()  大文字化(C# の ToUpper)
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
// GOAL: map(変換) / filter(絞り込み) / find(最初の1個)の3つを目で見る

const words = ["蔵書一覧", "読書会", "アクセス", "文芸", "海外文学"];

// STEP 1: map(Select 相当) — 全要素を「文字数」に変換する。
//         元の配列は変わらず、変換後の新しい配列が返る。
const lengths = words.map((w) => w.length);
console.log("--- STEP 1: map --- 各語の文字数:", lengths);

// STEP 2: filter(Where 相当) — 4文字以上の語だけ残す。
//         アロー関数が true を返した要素だけが新しい配列に残る。
const longOnes = words.filter((w) => w.length >= 4);
console.log("--- STEP 2: filter --- 4文字以上:", longOnes);

// STEP 3: filter → map をつなぐ(Where → Select) — 4文字以上を「〈語〉」で囲む。
//         メソッドチェーンで「絞り込んでから変換」が1行で書ける。
const decorated = words.filter((w) => w.length >= 4).map((w) => `〈${w}〉`);
console.log("--- STEP 3: filter+map --- 整形結果:", decorated);

// STEP 4: find(First 相当) — 最初に「4文字以上」になる語を1つだけ取り出す。
//         見つからなければ undefined(下の変えてみるで確認)。
const firstLong = words.find((w) => w.length >= 4);
console.log("--- STEP 4: find --- 最初の4文字以上の語:", firstLong);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、リンクURLの配列から「/ で始まる内部リンクだけ」を filter で集めます。
// w.startsWith("/") は「/ で始まるか」を返します(C# の StartsWith)。
// 実行する前に予測: links のうち残るのはどれで、何個でしょう?
console.log("--- 予測してみよう ---");
const links = ["/books", "https://example.com", "/event", "mailto:info@x.test", "/access"];
const internal = links.filter((w) => w.startsWith("/"));
console.log("内部リンクだけ:", internal);
console.log("個数         :", internal.length);

// --- 変えてみる ---------------------------------------------------------
// find は「見つからなければ undefined」。条件に合う要素が無いとどうなるか見ておく。
// この undefined を安全に扱う方法は概念4(?? 演算子)で扱います。
console.log("--- 変えてみる ---");
const notFound = words.find((w) => w.length >= 100);  // そんな長い語は無い
console.log("100文字以上の語:", notFound, "(無いので undefined)");

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の rawTags(split 直後で各要素に空白が残っている状態)から、
//       各要素の前後空白を trim した配列を map で作り、result3 に入れてください
//       (期待値: ["文芸", "海外文学", "新刊"])。
// ヒント(概念レベル): 絞り込みは不要。rawTags.map(<各要素を変換する式>) の形。
//                     変換は前後空白を取る t.trim()。
const rawTags = [" 文芸", " 海外文学 ", "新刊 "];

let result3: string[] | null = null;
// ここに書く(result3 に代入する。map で各要素を trim)

check("概念3: map で整形", result3, ["文芸", "海外文学", "新刊"],
  'rawTags.map((t) => t.trim()) の形。filter は不要');

export {};
