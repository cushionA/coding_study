/* =====================================================================
 * 概念2: zod で実行時に検証する(= 実行時の DataAnnotations、ただし型が生える)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念1で開いた穴 —「型注釈も as も実行時には存在しない」— を塞ぎます。
 *   実務でこれが効くのは主に3つの場面です:
 *     ① 外部APIの取り込み(今日)。壊れた1件を検知して、その1件だけ捨てて
 *        残りを保存する。全部落として夜間バッチを止めるより、ずっとマシです。
 *     ② バックエンドAPIの入口(unit06)。ブラウザから来る ?page=abc のような
 *        リクエストを検証して 400 を返す。ユーザー入力も「境界の外側」です。
 *     ③ 環境変数(unit01の続き)。起動時に設定の形を検証して fail fast する。
 *   検証を書く場所は「境界1箇所」。そこを通った後の内側では、値の形を疑わなくてよい —
 *   この安心感を作るのが目的です。
 *
 * ■ 解説:
 *   ● zod とは
 *     「値の形」を **オブジェクトとして** 書いておき、実行時に照合するライブラリです。
 *     C# で近いのは DataAnnotations([Required], [Range(1,5)])+
 *     Validator.TryValidateObject。「宣言的に条件を書いて、実行時に検査する」点は同じ。
 *     決定的に違うのは **スキーマから TypeScript の型が生えてくる** ことです。
 *     C# なら「クラス定義(型)」と「属性(検証)」を両方書きますが、
 *     zod はスキーマ1つ書けば、型は z.infer が自動で導きます。
 *     型定義と検証がズレる(=よくあるバグ)ことが原理的に起きません。
 *
 *   ● 使う API(すべてこのファイルで初出)
 *     import { z } from "zod";
 *       z.object({ キー: スキーマ, ... })  … オブジェクトの形。zod の中心。
 *       z.string() / z.number() / z.boolean()  … プリミティブの形
 *       z.array(スキーマ)                 … 「そのスキーマの配列」
 *       .int()                            … 整数であること(1.5 を弾く)
 *       .min(n) / .max(n)                 … 文字列なら長さ、数値なら値の範囲
 *       .nullable()                       … **null を許す**(キー自体は必須)= C# の string?
 *       .optional()                       … **キーが無くてもよい**(null は許さない)
 *           ↑ JSON では「キーが無い」と「値が null」は別物です。C# には null しか
 *             ないので馴染みが薄いですが、外部APIでは両方が混ざって飛んできます。
 *             両方許したいなら .nullable().optional() と重ねます。
 *
 *       スキーマ.safeParse(値)  … 検査して **例外を投げずに** 結果オブジェクトを返す:
 *             成功 → { success: true,  data: 検証済みの値(型付き) }
 *             失敗 → { success: false, error: ZodError }
 *           これは TypeScript の「判別可能ユニオン(discriminated union)」で、
 *           if (r.success) と書いた中では r.data が、else では r.error が
 *           コンパイラに見えるようになります(C# の TryParse の out 引数の役割を
 *           戻り値だけで型安全にやっている、と考えると近いです)。
 *       スキーマ.parse(値)      … 失敗したら例外を投げる版。
 *           境界では safeParse を使います。「失敗をどう扱うか(捨てる/ログ/リトライ)」を
 *           呼び出し側で決めたいからです。parse は「絶対に正しいはず」の内部データ向け。
 *
 *       r.error.issues … 失敗の一覧(配列)。1件は主に3つの情報を持つ:
 *             path    … どのフィールドか。入れ子は配列で ["author", "name"]、
 *                       配列の要素は添字が入って ["tags", 1]
 *             code    … 失敗の種類。"invalid_type" / "too_small" / "too_big" など
 *             message … 人間向けの説明文
 *           ログにはこの path を必ず出します。「どの本のどの項目が壊れたか」が
 *           分からないと、実務では調査が始まりません。
 *
 *       z.infer<typeof スキーマ>  … スキーマから TypeScript の型を導出する。
 *           typeof が付くのは「値であるスキーマ変数から、その型を取り出す」ため。
 * ===================================================================== */

import { z } from "zod";

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
// GOAL: スキーマを1つ書くだけで、実行時の検査と TypeScript の型の両方が手に入ること、
//       そして失敗が「どこが・なぜ」まで分かる形で返ってくることを見る。

// STEP 1: 外部APIが返す1件分の形をスキーマとして宣言する
//   これはただの値(オブジェクト)です。関数に渡すことも配列に入れることもできます。
const BookDtoSchema = z.object({
  id: z.number().int(),                                      // 整数の数値
  title: z.string().min(1),                                  // 1文字以上の文字列
  author: z.object({ id: z.number().int(), name: z.string() }), // 入れ子もそのまま書ける
  published_year: z.number().int().nullable(),               // 数値 または null
  price_yen: z.number(),
  tags: z.array(z.string()),                                 // 文字列の配列
  isbn: z.string().nullable(),
});

// STEP 2: スキーマから TypeScript の型を生やす(手書きの type 定義は書かない)
type BookDto = z.infer<typeof BookDtoSchema>;
//   ↑ この BookDto は
//     { id: number; title: string; author: { id: number; name: string };
//       published_year: number | null; price_yen: number; tags: string[];
//       isbn: string | null } と完全に等価。エディタで BookDto にカーソルを合わせると見えます。
function describe(dto: BookDto): string {
  return `${dto.title} / ${dto.author.name} / ${dto.tags.length}タグ`;
}

// STEP 3: 正しい形のデータを safeParse する
const rawOk: unknown = {
  id: 1042,
  title: "吾輩は猫である",
  author: { id: 7, name: "夏目漱石" },
  published_year: 1905,
  price_yen: 780,
  tags: ["古典", "小説"],
  isbn: null,
};
const parsed = BookDtoSchema.safeParse(rawOk);
console.log("STEP 3: success =", parsed.success);
if (parsed.success) {
  // この { } の中では parsed.data の型は BookDto。unknown ではなくなっている。
  console.log("STEP 3: 検証済みデータを型付きで使える →", describe(parsed.data));
}

// STEP 4: 壊れたデータを流す。どこが・なぜ壊れているかが列挙される
const rawBroken: unknown = {
  id: 1043,
  title: "",                                  // min(1) 違反
  author: { id: 8, name: 12345 },             // 入れ子の中の型違反
  published_year: "1934",                     // 文字列で来た(数値のはず)
  price_yen: 640,
  tags: ["古典", 3],                          // 配列の2番目が数値
  isbn: null,
};
const bad = BookDtoSchema.safeParse(rawBroken);
console.log("STEP 4: success =", bad.success);
if (!bad.success) {
  for (const issue of bad.error.issues) {
    console.log(`  - path=${issue.path.join(".")} code=${issue.code} msg=${issue.message}`);
  }
}
//   ★ 概念1の手書きチェックとの差: 入れ子も配列の中も、書いていないのに検査されている。
//     そして「1つ目で止まらず全部の違反を集める」ので、1回の実行で全部直せる。

// STEP 5: 実務の型 — 「壊れた1件だけ捨てて、残りを活かす」
const rawList: unknown[] = [rawOk, rawBroken, { ...(rawOk as object), id: 1044, title: "坊っちゃん" }];
const accepted: BookDto[] = [];
const rejected: string[] = [];
for (const [index, raw] of rawList.entries()) {
  const r = BookDtoSchema.safeParse(raw);
  if (r.success) accepted.push(r.data);
  else rejected.push(`${index + 1}件目: ${r.error.issues.map((i) => i.path.join(".")).join(", ")}`);
}
console.log("STEP 5: 採用 =", accepted.map(describe));
console.log("STEP 5: 却下 =", rejected);

// STEP 6: parse は失敗すると例外を投げる(境界では safeParse を使う理由)
try {
  BookDtoSchema.parse(rawBroken);
} catch (err) {
  console.log("STEP 6: parse は throw する →", (err as Error).name);
}

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 先方が後方互換のつもりで新しいキー `campaign_note` を足してきました。
//       スキーマには書いていません。safeParse の success は true? false?
//       true の場合、data に campaign_note は残っている?
//   (2) published_year は .nullable() です。**キーごと存在しない** データを渡したら通る?
//   (3) memo: z.string().optional() というフィールドに、値 null を渡したら通る?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const withExtra = BookDtoSchema.safeParse({ ...(rawOk as object), campaign_note: "夏の10%オフ" });
console.log("変えてみる (1): success =", withExtra.success);
if (withExtra.success) {
  console.log("変えてみる (1): data のキー =", Object.keys(withExtra.data));
}

const { published_year: _omit, ...withoutYear } = rawOk as Record<string, unknown>;
const missingKey = BookDtoSchema.safeParse(withoutYear);
console.log("変えてみる (2): success =", missingKey.success,
  "/ issues =", missingKey.success ? [] : missingKey.error.issues.map((i) => `${i.path.join(".")}:${i.message}`));

const MemoSchema = z.object({ memo: z.string().optional() });
console.log("変えてみる (3): キー無し →", MemoSchema.safeParse({}).success,
  "/ null を渡す →", MemoSchema.safeParse({ memo: null }).success);
//   ※ (1) の挙動(知らないキーは黙って捨てて成功)は zod の既定です。
//     外部APIが項目を **足す** 分にはこちらが壊れない、という後方互換のための設計。
//     逆に「知らないキーが来たら失敗させたい」場合は z.strictObject を使います。

// --- 書いてみる ---------------------------------------------------------
// 課題: レビューAPIのレスポンス1件分のスキーマ ReviewSchema を書いてください。
//       仕様(先方のAPIドキュメントだと思ってください):
//         review_id … 整数の数値。必須
//         rating    … 数値。1以上5以下。必須
//         comment   … 文字列 **または null**。キーは必須
//       (書けたら、下の判定ブロックが4件のデータを自動で検証してくれます)
// ヒント(概念レベル): z.object の中にキーを3つ並べるだけです。範囲は .min/.max、
//   「または null」は .nullable() を鎖のようにつなげます。
let ReviewSchema: z.ZodType | null = null;
// ここに書く(ReviewSchema に z.object({ ... }) を代入する)

const rawReviews: unknown[] = [
  { review_id: 1, rating: 5, comment: "最高の一冊" },   // 正しい
  { review_id: 2, rating: 9, comment: null },           // rating が範囲外
  { review_id: 3, rating: 4, comment: 123 },            // comment が文字列でも null でもない
  { review_id: 4, rating: 3, comment: null },           // 正しい(comment は null 可)
];

// 判定用の小道具: 4件を順に検証して「合格数」と「失敗した最初のフィールド名」を集める
// (ここは書き換えなくて構いません)
function judgeReviews(schema: z.ZodType | null): { okCount: number; ngPaths: string[] } | null {
  if (schema === null) return null; // 未記入のときは判定しない
  let okCount = 0;
  const ngPaths: string[] = [];
  for (const raw of rawReviews) {
    const r = schema.safeParse(raw);
    if (r.success) okCount++;
    else ngPaths.push(r.error.issues[0]?.path.join(".") ?? "(不明)");
  }
  return { okCount, ngPaths };
}
const result2 = judgeReviews(ReviewSchema);

check("概念2: zod スキーマで実行時検証する", result2, { okCount: 2, ngPaths: ["rating", "comment"] },
  "null のまま → ReviewSchema が未記入。okCount が 3 で ngPaths が [\"comment\"] だけ → " +
  "rating の上限(5以下)を書いていない。okCount が 3 で ngPaths が [\"rating\"] だけ → " +
  "comment の型指定が緩い(z.any() など)。okCount が 0 → comment の null を許していない、" +
  "または review_id の指定がデータと合っていない");

export {};
