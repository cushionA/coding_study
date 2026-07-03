/* =====================================================================
 * 概念4: パイプラインの統合と出力検証
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   ここまでの「クレンジング」「例外処理・スキップ」「CSV出力」は、
 *   実務では1つの関数の中で順番につながって動きます。バラバラのパーツを
 *   組み立てて1本のパイプラインにする経験は、unit06のキャップストーンで
 *   さらに大きなスケールで使うことになります。あわせて、出力されたCSVが
 *   本当に正しいかを「期待値ファイルとの完全一致」で機械的に検証する、
 *   という考え方も押さえておきます。
 *
 * ■ 解説:
 *   パイプラインは次の3段階です:
 *
 *     [抽出]              [クレンジング+検証]         [CSV化]
 *     生のテキストの配列  → 数値/日付に変換し、       → ヘッダ+行の
 *     (RawRecord[])         不正な行はスキップ           文字列
 *                           (CleanRecord[])            (string)
 *
 *   それぞれの段階は「前の段階の出力の形を、次の段階がそのまま受け取れる」
 *   ように型を揃えて設計するのがコツです(C#で言えば、メソッドチェーンの
 *   各ステップの戻り値の型と次の引数の型を合わせる設計)。
 *
 *   出力を検証する最もシンプルな方法は「期待されるCSV文字列と完全一致するか」
 *   を確認すること。1文字でもズレていたら不一致になるので、区切り文字や
 *   改行コード、末尾の改行の有無まで意識する必要があります。
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
// GOAL: 3段階のパイプラインが「配列→配列→文字列」と形を変えながらつながる様子を見る

type RawRow = { name: string; price: string };
type CleanRow = { name: string; price: number };

console.log("--- STEP 1: 抽出段階(まだ文字列のまま) ---");
const rawRows: RawRow[] = [
  { name: "文芸書", price: "¥1,200" },
  { name: "価格未定本", price: "価格未定" },
  { name: "写真集", price: "¥3,000" },
];
console.log(rawRows);

console.log("--- STEP 2: クレンジング+検証段階(不正行はスキップ) ---");
function cleanRow(row: RawRow): CleanRow | null {
  const price = Number(row.price.replace(/[¥,]/g, ""));
  if (Number.isNaN(price)) {
    console.log(`  スキップ: ${row.name}(価格が不正: ${row.price})`);
    return null;
  }
  return { name: row.name, price };
}
const cleanRows = rawRows
  .map(cleanRow)
  .filter((row): row is CleanRow => row !== null);
console.log("クレンジング後:", cleanRows);

console.log("--- STEP 3: CSV化段階(配列 → 1本の文字列) ---");
function toCsv(rows: CleanRow[]): string {
  const lines = ["name,price", ...rows.map((r) => `${r.name},${r.price}`)];
  return lines.map((l) => `${l}\n`).join("");
}
const csv = toCsv(cleanRows);
console.log(JSON.stringify(csv));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは、生成したCSVと「期待するCSV文字列」を比較します。
// 実行前に予測: この2つは一致するでしょうか?(スキップされた1件を考慮すること)
console.log("--- 予測してみよう ---");
const expectedCsv = "name,price\n文芸書,1200\n写真集,3000\n";
console.log("生成したCSVと期待値は一致?:", csv === expectedCsv);

// --- 変えてみる ---------------------------------------------------------
// 末尾の改行を忘れるとどうなるか(よくある事故)を確認する。
console.log("--- 変えてみる ---");
const csvWithoutTrailingNewline = csv.trimEnd();
console.log("末尾改行を落とすと一致しなくなる:", csvWithoutTrailingNewline === expectedCsv);

// --- 書いてみる ---------------------------------------------------------
// 課題: rawRows(このファイル上部で定義済み)を cleanRow でクレンジングし、
//       不正行(価格未定本)を取り除いた有効な行数を result4 に入れてください
//       (期待値: 2)。
// ヒント(概念レベル): STEP 2 と同じ .map().filter() の組み合わせの結果の
//       .length を使う
let result4: number | null = null;
// ここに書く(result4 に代入する)

check("概念4: パイプラインの統合", result4, 2,
  "rawRows.map(cleanRow).filter((r) => r !== null) の .length を数える");

/* =====================================================================
 * ユニット振り返り
 * ---------------------------------------------------------------------
 * ここまでで、実データの汚れをクレンジングし(概念1)、失敗に強いリトライを
 * 組み立て(概念2)、CSVを標準機能だけで自作し(概念3)、それらを1本の
 * パイプラインとしてつなぎ検証する(概念4)ところまでを一通り触りました。
 * 自分の言葉で「NaNとundefinedの違い」「指数バックオフになぜジッタを
 * 足すか」を説明できるか、一度声に出して確認してみてください。
 *
 * 次のunit06キャップストーンでは、ここで作ったクレンジング・CSV出力を
 * 複数ページのクロール(unit04のfetchマナー込み)と組み合わせ、
 * 一気通貫のスクレイパーに仕上げます。
 * ===================================================================== */

export {};
