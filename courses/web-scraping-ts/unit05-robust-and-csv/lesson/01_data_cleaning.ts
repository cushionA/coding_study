/* =====================================================================
 * 概念1: データクレンジングと NaN(型変換の落とし穴)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   実際のWebページの価格表記は "¥1,200" "3,600円" "￥ 2,480" のように
 *   まったく統一されていません。集計やCSV出力の前に、これを素直な数値へ
 *   直す「クレンジング」工程が必須です。ここをサボると Number化に失敗した
 *   値がこっそり紛れ込み、後工程で謎のバグになります。
 *
 * ■ 解説:
 *   C# の int.TryParse(s, out var n) は「変換できたか」を bool で返し、
 *   失敗しても例外を投げません。TypeScript の Number(s) はこれと似ていて
 *   例外は投げませんが、失敗すると NaN(Not a Number)という特殊な数値を
 *   返します。ここで2つの罠があります:
 *
 *     1. Number("") は NaN ではなく 0 になる(空文字は「変換失敗」として
 *        扱いたいのに、こっそり成功してしまう)
 *     2. NaN === NaN は false になる(自分自身とすら等しくない)。
 *        NaN かどうかを調べるには専用の Number.isNaN(x) を使う必要がある
 *        (C# の double.IsNaN(x) に相当)
 *
 *   だからこの後の演習では「空文字なら先にNaNを返す」というガードを
 *   自分で書く必要があります。
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
// GOAL: Number() の「例外を投げない」挙動と NaN の扱いにくさを目で見る

console.log("--- STEP 1: 正常な変換 ---");
console.log('Number("1200") =', Number("1200"));

console.log("--- STEP 2: 失敗するはずの変換 ---");
console.log('Number("価格未定") =', Number("価格未定"));
console.log("これは NaN。しかし NaN === NaN は?:", Number("価格未定") === Number("価格未定"));

console.log("--- STEP 3: 空文字の罠 ---");
console.log('Number("") =', Number(""), "(NaNではなく0になってしまう!)");

console.log("--- STEP 4: 正しいNaN判定 ---");
console.log("Number.isNaN(NaN) =", Number.isNaN(NaN));
console.log('isNaN判定を使えば "価格未定" が変換失敗だと分かる:',
  Number.isNaN(Number("価格未定")));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、通貨記号・カンマ・全角空白を含む文字列を正規表現で除去してから
// Number化します。実行前に予測: "￥　2,480" は何に変換されるでしょうか?
console.log("--- 予測してみよう ---");
const raw = "￥　2,480";
const stripped = raw.replace(/[¥￥,円\s　]/g, "");
console.log("除去後の文字列:", JSON.stringify(stripped));
console.log("Number化した結果:", Number(stripped));

// --- 変えてみる ---------------------------------------------------------
// 「空文字を先に弾く」ガードを入れないとどうなるか比較する。
console.log("--- 変えてみる ---");
const emptyAfterStrip = "円".replace(/[¥￥,円\s　]/g, "");
console.log("「円」だけの文字列を除去すると:", JSON.stringify(emptyAfterStrip),
  "→ ガードなしでNumber化すると", Number(emptyAfterStrip), "になってしまう(0円と誤認識)");

// --- 書いてみる ---------------------------------------------------------
// 課題: "3,600円" を数値化してください。通貨記号・カンマ・円・空白を取り除いてから
//       Number化する2段階の処理です(期待値: 3600)。
// ヒント(概念レベル): 正規表現 /[¥￥,円\s　]/g で不要な文字を全部消してから Number() に渡す
let result1: number | null = null;
// ここに書く(result1 に代入する)

check("概念1: 通貨表記の数値化", result1, 3600,
  '"3,600円".replace(/[¥￥,円\\s　]/g, "") で不要な文字を消してから Number(...) する');

export {};
