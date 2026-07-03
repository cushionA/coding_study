// ex01_clean_fields: 実データのクレンジング(空白正規化・通貨/カンマ除去・数値化)
// スクレイピングしたテキストは全角空白・通貨記号・カンマ・末尾の「円」などが
// 平気で混ざる。C#の int.TryParse(s, out var n) が「変換できたか」を bool で
// 返すのに対し、TypeScriptの Number(s) は変換できないとき例外を投げず
// NaN(Not a Number)という特別な数値を返す。NaN は isNaN() でしか検出できず、
// NaN === NaN も false になる(自分自身とすら等しくない)という罠があるので要注意。

// 文字列前後の空白(半角・全角スペース・タブ・改行)を取り除く
// 全角スペース"　"(U+3000)は.trim()だけでは取り除けないので一手間必要
// 例: "　星屑の図書館　" -> "星屑の図書館"
export function cleanText(text: string): string {
  return text.replace(/^[\s　]+|[\s　]+$/g, "");
}

// "¥1,200" や "3,600円" のような価格表記を数値(円)に変換する
// 通貨記号(¥/￥)・カンマ・「円」・前後の空白(全角含む)を取り除いてからNumber化する
// 変換できない場合(例: "価格未定")はNaNを返す(C#のint.TryParseがfalseを返す場面に相当するが、
// TSではエラーを投げる代わりにNaNという「数値ではない数値」を返す)
// 例: "¥1,200" -> 1200 / "3,600円" -> 3600 / "価格未定" -> NaN
export function parsePriceYen(text: string): number {
  const normalized = cleanText(text).replace(/[¥￥,円\s　]/g, "");
  if (normalized === "") return NaN;
  return Number(normalized);
}

// "15" や " 4 " のような在庫数表記を整数に変換する
// 前後の空白を除いてからNumber化する。"-" のような数値でない文字列はNaNを返す
export function parseStock(text: string): number {
  const normalized = cleanText(text);
  if (normalized === "") return NaN;
  return Number(normalized);
}

// "2026/11/3" "2026-11-05" "2026.11.09" のように区切り文字が揺れた日付文字列を
// "YYYY-MM-DD"(月日は2桁ゼロ埋め)に正規化する
// 区切り文字は "/" "-" "." のいずれか1種類のみが使われている前提でよい
// 例: "2026/11/3" -> "2026-11-03" / "2026.11.09" -> "2026-11-09"
export function normalizeDate(text: string): string {
  const [year, month, day] = cleanText(text).split(/[/.\-]/);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
