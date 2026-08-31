/* =====================================================================
 * 概念3: DTO → ドメインモデルの変換(境界の外と内で形を分ける)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念2で「外から来た JSON が正しい形か」は確かめられるようになりました。
 *   でも、その形のままアプリ全体に流してよいかは別の話です。
 *   外部APIの JSON は先方の都合で決まっています: スネークケース、入れ子、
 *   null だらけ、日付は文字列、いらない項目が20個。これをそのまま
 *   Prisma のモデルにも React の props にも使うと、**先方が項目名を1つ変えた日に
 *   アプリ中のファイルを直す**ことになります。
 *   だから境界で1回だけ「自分たちの言葉」に翻訳します。翻訳した後の内側は、
 *   外部APIが明日どう変わろうと関係ありません。直すのは変換関数1本だけ。
 *   この考え方には名前が付いていて、腐敗防止層(Anti-Corruption Layer)と呼びます。
 *   実務でこの層を持たないシステムは、外部の事情がじわじわ内部設計を侵食していきます。
 *
 * ■ 解説:
 *   ● DTO と ドメインモデル
 *     DTO(Data Transfer Object)= 通信で運ぶための、相手の都合の形。
 *     ドメインモデル = 自分のアプリが扱いやすい形。
 *     C# で言えば、API のレスポンス用クラスと Entity / ビジネスモデルクラスを
 *     分けて、Mapper で詰め替えるのと同じ構図です(AutoMapper の手書き版)。
 *     TypeScript では DTO 型は zod スキーマから z.infer で生やし、
 *     ドメイン型は自分で type として書く、という分担になります。
 *
 *   ● 変換関数がやる仕事は、だいたいこの5つ
 *     1. 命名の翻訳     : published_year → publishedYear(JS/TS は camelCase 文化)
 *     2. 入れ子の平坦化 : author.name → authorName(画面や DB の1列に対応させる)
 *     3. 「無い」の統一 : JS には null と undefined の2つの「無い」がある
 *                        (C# には null しかないので、ここは新しい悩みどころ)。
 *                        境界でどちらかに寄せる。このコースでは **null に統一** します。
 *                        理由: unit03 で使う Prisma が「値が無い列」を null で表すから。
 *                        内側で「null? undefined? どっちを判定すればいい?」と
 *                        毎回悩まないための決めごとです。
 *     4. 型の昇格       : "2024-03-05T09:00:00Z" という文字列 → Date、
 *                        "780" → 780。境界を越えたら、もう文字列を再解釈しない。
 *     5. 導出値の計算   : 4/5 → 80(%)のような、内側で使いやすい形の追加。
 *
 *   ● 順番は「検証 → 変換」
 *     zod の safeParse を通した後の値だけを変換関数に渡します。こうすると
 *     変換関数は「形は正しい」前提で書けるので、if だらけになりません。
 *     (zod には .transform() でスキーマの中に変換を書き込む機能もありますが、
 *      検証と変換を分けたほうが、変換だけを純粋関数として単体テストできます。
 *      演習でも「検証」と「変換」は別の関数として書いてもらいます)
 *
 *   ■ このファイルで使う新しい構文・API:
 *     ・?. (オプショナルチェーン)… a?.b は a が null/undefined なら評価を止めて
 *          undefined を返す。C# の ?. と綴りも意味も同じ。
 *     ・?? (null 合体)… 左が null/undefined のときだけ右を使う。C# の ?? と同じ。
 *          0 や "" は「値がある」扱いなので右に落ちない点に注意(|| との違い)。
 *     ・new Date("2024-03-05T09:00:00Z") … ISO 8601 文字列から Date を作る。
 *          末尾の Z は UTC の意味。
 *     ・date.getUTCFullYear() … UTC 基準で年を取り出す。getFullYear() は
 *          実行マシンのタイムゾーン基準なので、集計では UTC 系を使うと結果がぶれません。
 *     ・date.toISOString() … Date を "2024-03-05T09:00:00.000Z" 形式の文字列に戻す。
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
// GOAL: 「外部APIの生の形」と「アプリ内で使う形」を並べて見比べ、
//       その間をつなぐ変換関数が具体的に何をしているのかを1行ずつ確認する。

// STEP 1: 外部APIの生 JSON(スネークケース・入れ子・null・文字列の日付・不要項目)
const rawBooks: unknown[] = [
  {
    book_id: 1042,
    title_text: "吾輩は猫である",
    author: { author_id: 7, display_name: "夏目漱石" },
    price: { amount: 780, currency: "JPY" },
    published_at: "1905-10-06T00:00:00Z",
    tag_list: ["古典", "小説"],
    _internal_rank: 12,          // 先方の内部都合の項目。こちらには不要
  },
  {
    book_id: 1043,
    title_text: "銀河鉄道の夜",
    author: null,                // 著者不明。null で来る
    price: { amount: 640, currency: "JPY" },
    published_at: null,          // 発行日不明
    tag_list: null,              // タグ「無し」が空配列ではなく null で来る(実務あるある)
    _internal_rank: 5,
  },
  {
    book_id: 1044,
    title_text: "",              // 壊れた1件(タイトルが空)
    author: { author_id: 9, display_name: "不明" },
    price: { amount: 520, currency: "JPY" },
    published_at: "1906-04-01T00:00:00Z",
    tag_list: [],
    _internal_rank: 1,
  },
];

// STEP 2: 境界の外側の形(DTO)を zod スキーマで宣言する(概念2の復習)
const BookDtoSchema = z.object({
  book_id: z.number().int(),
  title_text: z.string().min(1),
  author: z.object({ author_id: z.number().int(), display_name: z.string() }).nullable(),
  price: z.object({ amount: z.number(), currency: z.string() }),
  published_at: z.string().nullable(),
  tag_list: z.array(z.string()).nullable(),
});
type BookDto = z.infer<typeof BookDtoSchema>;

// STEP 3: 境界の内側の形(ドメインモデル)を、自分たちの言葉で定義する
//   ここは外部APIの都合を1ミリも引きずらない。unit03 で作る Prisma の model と
//   unit07 で React に渡す props は、この形を基準にします。
type Book = {
  externalId: string;      // 外部APIの id。文字列で持つ(unit04 の upsert の突合キーになる)
  title: string;
  authorName: string;      // 不明なら "不明" に寄せる(内側では null を持たない選択)
  priceYen: number;
  publishedAt: Date | null; // 日付は Date に昇格。不明は null(undefined は使わない)
  tags: string[];          // 「無し」は空配列に統一(null を消す)
};

// STEP 4: 変換関数。検証済みの DTO だけを受け取るので、形の心配は不要
function toBook(dto: BookDto): Book {
  return {
    externalId: `bk-${dto.book_id}`,                     // 1. 命名の翻訳 + 4. 型の昇格(数値→文字列)
    title: dto.title_text,                               // 1. 命名の翻訳
    authorName: dto.author?.display_name ?? "不明",       // 2. 平坦化 + 3.「無い」の統一
    priceYen: dto.price.amount,                          // 2. 平坦化(currency は内側では使わない)
    publishedAt: dto.published_at === null ? null : new Date(dto.published_at), // 4. 型の昇格
    tags: dto.tag_list ?? [],                            // 3. null を空配列に統一
  };
}

// STEP 5: 「検証 → 変換」を配列全体に適用する。壊れた1件は捨ててログに残す
const books: Book[] = [];
for (const [index, raw] of rawBooks.entries()) {
  const r = BookDtoSchema.safeParse(raw);
  if (!r.success) {
    console.log(`STEP 5: ${index + 1}件目を却下 → ${r.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    continue;
  }
  books.push(toBook(r.data));
}
for (const b of books) {
  console.log("STEP 5: 変換後 =", {
    ...b,
    publishedAt: b.publishedAt === null ? null : b.publishedAt.toISOString(), // 表示用に文字列化
  });
}
console.log("STEP 5: 発行年だけ取り出す =",
  books.map((b) => b.publishedAt?.getUTCFullYear() ?? null));
//   ↑ 内側では「publishedAt は Date か null」しかあり得ないので、この1行が安全に書ける。
//     DTO のままだったら、ここで毎回 new Date(文字列) と null 判定を書く羽目になります。

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) toBook から `?? "不明"` を外して dto.author?.display_name だけにすると、
//       著者が null の本の authorName はどうなる? 型注釈は string のままなのに?
//   (2) `dto.tag_list ?? []` を `dto.tag_list` に変えると、後で tags.map(...) を
//       呼んだときに何が起きる?(tag_list が null の本があります)
//   (3) 発行日が "1905-10-06T00:00:00Z" のとき、getUTCFullYear() は 1905。
//       では price.amount が文字列 "780" で来たら、STEP 2 の検証はどうなる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
function toBookSloppy(dto: BookDto): Book {
  return {
    externalId: `bk-${dto.book_id}`,
    title: dto.title_text,
    authorName: dto.author?.display_name as string, // (1) ?? を外し、as で型だけ合わせた
    priceYen: dto.price.amount,
    publishedAt: dto.published_at === null ? null : new Date(dto.published_at),
    tags: dto.tag_list as string[],                 // (2) ?? [] を外し、as で型だけ合わせた
  };
}
const sloppy = toBookSloppy(BookDtoSchema.parse(rawBooks[1]));
console.log("変えてみる (1): authorName =", sloppy.authorName, "/ typeof =", typeof sloppy.authorName);
try {
  console.log("変えてみる (2): tags を大文字化 →", sloppy.tags.map((t) => t.toUpperCase()));
} catch (err) {
  console.log("変えてみる (2): 例外 →", (err as Error).message);
}
const priceAsString = BookDtoSchema.safeParse({ ...(rawBooks[0] as object), price: { amount: "780", currency: "JPY" } });
console.log("変えてみる (3): success =", priceAsString.success,
  "/ path =", priceAsString.success ? [] : priceAsString.error.issues.map((i) => i.path.join(".")));
//   ※ (1)(2) は概念1と同じ罠です。as で黙らせた嘘は、必ず後の行で回収させられます。
//     変換関数の中で「無い」を潰しておけば、内側にはこの問題が漏れません。

// --- 書いてみる ---------------------------------------------------------
// 課題: レビューAPIの DTO を、アプリ内の Review 型に変換する toReview を書いてください。
//       変換ルール:
//         id           … "rv-" + review_id(例: review_id が 501 なら "rv-501")
//         bookTitle    … book.title_text(入れ子の平坦化)
//         ratingPercent… score.value を score.max で割って 100 倍した数値(4/5 なら 80)
//         postedYear   … posted_at(ISO文字列)の **UTC 基準の年**(数値)
//         body         … body_text。null のときは空文字 "" にする
// ヒント(概念レベル): 5行とも「dto の中の値を1つ取り出して形を変える」だけです。
//   割合は掛け算、年は Date にしてから取り出す、null の既定値は ?? で。
type ReviewDto = {
  review_id: number;
  book: { book_id: number; title_text: string };
  score: { value: number; max: number };
  posted_at: string;
  body_text: string | null;
};
type Review = {
  id: string;
  bookTitle: string;
  ratingPercent: number;
  postedYear: number;
  body: string;
};

function toReview(dto: ReviewDto): Review | null {
  // ここに書く(Review を return する。書けたら下の「未実装の目印」の行は消す)
  return null; // 未実装の目印
}

const reviewDto: ReviewDto = {
  review_id: 501,
  book: { book_id: 1042, title_text: "吾輩は猫である" },
  score: { value: 4, max: 5 },
  posted_at: "2024-03-05T09:00:00Z",
  body_text: null,
};

let result3: Review | null = null;
const converted = toReview(reviewDto);
// 判定時にキーの並び順をそろえるため、ここで詰め直しています(比較の都合であって解答ではありません)
if (converted !== null) {
  result3 = {
    id: converted.id,
    bookTitle: converted.bookTitle,
    ratingPercent: converted.ratingPercent,
    postedYear: converted.postedYear,
    body: converted.body,
  };
}

check("概念3: DTO をドメインモデルに変換する", result3,
  { id: "rv-501", bookTitle: "吾輩は猫である", ratingPercent: 80, postedYear: 2024, body: "" },
  "null のまま → toReview が未実装。id が \"rv-undefined\" → dto.review_id の綴り違い。" +
  "ratingPercent が 0.8 → 100 倍していない。postedYear が文字列 → new Date(...) を経由して " +
  "getUTCFullYear() を呼ぶ。body が null → ?? \"\" の既定値が抜けている");

export {};
