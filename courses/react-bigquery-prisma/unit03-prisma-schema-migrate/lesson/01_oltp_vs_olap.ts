/* =====================================================================
 * 概念1: なぜ保存先が2つあるのか — OLTP(Prisma)と OLAP(BigQuery)の役割分担
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   このコースで作るアプリには、データの保存先が2つ出てきます。
 *   アプリDB(Prisma + SQLite)と、分析用の BigQuery です。
 *   ここで誰もが一度は思うことがあります —
 *   「Prisma は ORM なんだから、Prisma で BigQuery も読み書きすればいいのでは?」
 *
 *   答えは No です。しかも「やらない方がいい」ではなく「そもそもできない」。
 *   Prisma 公式は BigQuery をサポートしていません(2026年8月時点で npm に
 *   @prisma/adapter-bigquery のような BigQuery 用アダプタは存在しません)。
 *   BigQuery は Google 公式クライアント @google-cloud/bigquery で直接叩きます。
 *
 *   そして重要なのは「対応してないから仕方なく分けている」のではなく、
 *   **そもそも解いている問題が違うから、道具が2つある**という点です。
 *   ここを腹に落とさないまま先に進むと、unit05 で BigQuery 用に別のクライアントを
 *   書くのも、unit08 で同じデータを2か所に書くのも、全部「無駄に複雑なだけの設計」に
 *   見えてしまいます。逆にここを握れば、以降のユニットは全部
 *   「今どっちの世界の話をしているか」で整理できます。
 *
 * ■ 解説:
 *
 *   ● OLTP と OLAP という2つの世界
 *
 *   データベースの用途は、大きく2つに分かれます。
 *
 *     OLTP (Online Transaction Processing) — 業務トランザクション処理
 *       「1件を速く正確に読み書きする」世界。
 *       例: 会員登録、注文の確定、本を1件保存する、一覧を20件出す。
 *       求められるのは 数ミリ秒の応答 と 正しさ(重複させない・中途半端に終わらせない)。
 *       代表選手: PostgreSQL / MySQL / SQL Server / SQLite。
 *
 *     OLAP (Online Analytical Processing) — 分析処理
 *       「大量の行をなめて集計する」世界。
 *       例: 過去3年の取り込みログ2億行を著者別に集計してダッシュボードに出す。
 *       求められるのは 巨大なスキャンを現実的な時間で終わらせること。
 *       1件取り出すのに数秒かかっても構わない。
 *       代表選手: BigQuery / Snowflake / Redshift。
 *
 *   ● なぜ1つのDBで両方やらないのか — 行指向と列指向
 *
 *   OLTP のDBは **行指向**(row-oriented)です。1行ぶんのデータが物理的に固まって
 *   置いてあるので、「id=42 の本を1件取る」が速い。C# で言えば
 *   List<Book> に近い持ち方です。
 *
 *   BigQuery は **列指向**(columnar)です。title は title だけ、price は price だけが
 *   まとまって置いてある。C# で言えば「Book[] ではなく、string[] Titles と
 *   double[] Prices を別々に持っている」形。こうすると
 *   「price 列だけを2億行ぶん合計する」ときに price 以外を一切読まなくて済むので、
 *   集計が桁違いに速く・安くなります。代わりに「1行ぶん全部欲しい」は苦手です。
 *
 *   さらに BigQuery には、OLTP のDBなら当然ある機能が無い/弱いです:
 *     ・主キーや一意制約が「強制されない」(宣言はできるが DB が守ってくれない)
 *     ・行単位の UPDATE/DELETE は可能だが高コスト。基本は追記(append)
 *     ・課金は **スキャンしたバイト数** ベース。SELECT * が高くつく(unit05 で扱います)
 *     ・1件だけ取っても数百ms〜数秒かかる。画面のレスポンスには使えない
 *
 *   つまり、アプリの一覧・検索・保存を BigQuery でやると「遅くて高くて壊れやすい」、
 *   2億行の集計を SQLite でやると「終わらない」。だから両方使うのです。
 *
 *   ● このコースでの役割分担(結論)
 *
 *     Prisma + SQLite/Postgres  … アプリの正(せい)のデータ。一覧・検索・保存。OLTP
 *     BigQuery                  … 分析用の副本。集計・履歴・ダッシュボード。OLAP
 *
 *   「正 = source of truth」は Prisma 側です。BigQuery が壊れてもアプリは動きます。
 *
 *   ● Prisma とは何か(C# アナロジー)
 *
 *   Prisma は、アプリDBを型安全に読み書きする ORM です。C# の EF Core とほぼ同じ役割で、
 *   対応関係はかなり素直です:
 *
 *       Prisma                              EF Core (C#)
 *       schema.prisma の model ブロック      エンティティクラス + Fluent API 設定
 *       prisma migrate dev                  dotnet ef migrations add + database update
 *       migrations/ ディレクトリ             Migrations/ フォルダ(履歴そのもの)
 *       PrismaClient                        DbContext
 *       prisma.book.findMany(...)           context.Books.Where(...).ToList()
 *       生成された型 BookCreateInput         Book エンティティ(の Insert 用の形)
 *
 *   大きな違いは「クラスを書いてDBを生やす」のではなく、**schema.prisma という
 *   専用の宣言ファイルが正本**で、そこから TypeScript の型もマイグレーションSQLも
 *   自動生成される点です(概念2〜4でやります)。
 *
 *   Prisma が対応している DB(provider)は
 *   postgresql / mysql / sqlite / sqlserver / mongodb / cockroachdb など。
 *   **この一覧に bigquery はありません。** 学習用には sqlite を使いますが、
 *   本番で Postgres に移すときは schema.prisma の provider を1行変えるのが基本です
 *   (限界もあります。下の STEP 6 で見ます)。
 *
 *   このファイルで使う新しいAPI: ありません。
 *   既習の TypeScript(型注釈・ユニオン型・配列の map/filter・テンプレートリテラル)だけで、
 *   「どっちに投げるべきか」を判定するコードを書きながら役割分担を体に入れます。
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

// --- 見る(worked example) ---------------------------------------------
// GOAL: 「この処理はどっちのDBの仕事か」を、感覚ではなく3つの判定材料で機械的に決める

// STEP 1: 保存先をユニオン型で定義する(打ち間違えたらエディタが赤線を出す)
type Store = "prisma" | "bigquery";

// STEP 2: 2つの世界の性格を並べて持つ。ここが今日いちばん覚えてほしい表。
type Profile = {
  kind: string;          // OLTP か OLAP か
  layout: string;        // 行指向 / 列指向
  goodAt: string;        // 得意なこと
  badAt: string;         // 苦手なこと
  constraints: string;   // 一意制約・トランザクションの有無
};
const PROFILE: Record<Store, Profile> = {
  prisma: {
    kind: "OLTP(業務トランザクション)",
    layout: "行指向(1行がまとまって置いてある)",
    goodAt: "1件の読み書き / 20件の一覧 / 部分一致検索 / 数ms〜数十msの応答",
    badAt: "数千万行を全部なめる集計(終わらない・重い)",
    constraints: "主キー・一意制約・トランザクションをDBが強制してくれる",
  },
  bigquery: {
    kind: "OLAP(分析)",
    layout: "列指向(列ごとにまとまって置いてある)",
    goodAt: "億単位の行を列だけ読んで集計 / 履歴の蓄積 / ダッシュボード",
    badAt: "1件取得(数百ms〜数秒) / 頻繁な UPDATE / 画面の即応答",
    constraints: "一意制約は強制されない。トランザクションも実務上あてにしない",
  },
};
console.log("STEP 2: 2つの世界の性格");
for (const store of ["prisma", "bigquery"] as Store[]) {
  const p = PROFILE[store];
  console.log(`  [${store}] ${p.kind} / ${p.layout}`);
  console.log(`     得意: ${p.goodAt}`);
  console.log(`     苦手: ${p.badAt}`);
  console.log(`     制約: ${p.constraints}`);
}

// STEP 3: 判定に使う3つの材料を型にする。
//   rowsScanned      … その処理が読む行数のオーダー
//   latencyBudgetMs  … 「何ms以内に返ってきてほしいか」。画面が待っているなら短い
//   needsTransaction … 複数の書き込みが「全部成功か全部失敗か」でなければ困るか
type Workload = {
  name: string;
  rowsScanned: number;
  latencyBudgetMs: number;
  needsTransaction: boolean;
};

// STEP 4: 判定関数。**上から順に**評価されるので、優先順位そのものが設計思想になる。
function routeTo(w: Workload): Store {
  // (1) 原子性が要るなら問答無用で OLTP。BigQuery にトランザクションは期待しない
  if (w.needsTransaction) return "prisma";
  // (2) 画面が待っている(応答が速くないと困る)なら OLTP
  if (w.latencyBudgetMs <= 300) return "prisma";
  // (3) 大量スキャンの集計なら OLAP
  if (w.rowsScanned >= 100_000) return "bigquery";
  // (4) どれにも当てはまらない小さな処理は、正のデータがある Prisma 側で済ませる
  return "prisma";
}

// STEP 5: 実際のユースケースを流してみる
const samples: Workload[] = [
  { name: "本を1件保存する", rowsScanned: 1, latencyBudgetMs: 200, needsTransaction: false },
  { name: "一覧20件をタイトル検索", rowsScanned: 5_000, latencyBudgetMs: 200, needsTransaction: false },
  { name: "過去3年の取り込みログを著者別に集計", rowsScanned: 8_000_000, latencyBudgetMs: 10_000, needsTransaction: false },
];
console.log("STEP 5: ユースケースの振り分け");
for (const w of samples) {
  console.log(`  ${routeTo(w).padEnd(8)} <- ${w.name}`);
}

// STEP 6: 「provider を1行変えれば Postgres に移れる」— その通り、ただし限界がある
const PORTABILITY: { ok: string[]; caution: string[] } = {
  ok: [
    "model の書き方・フィールド型・@id/@unique/@@index はそのまま使える",
    "PrismaClient の呼び出しコード(findMany/create など)は原則そのまま",
    "provider = \"sqlite\" を \"postgresql\" に変え、接続URLを差し替えるのが基本作業",
  ],
  caution: [
    "SQLite に無い機能(enum・配列型・Json型・大文字小文字を無視する検索など)は移行時に初めて使える/壊れる",
    "生成されるSQLは方言が違うので、既存の migrations/ は作り直しになる(履歴は移植できない)",
    "@db.VarChar(255) のようなDB固有の型指定はそのDBでしか意味を持たない",
  ],
};
console.log("STEP 6: SQLite → Postgres の差し替え");
for (const s of PORTABILITY.ok) console.log(`  [そのまま] ${s}`);
for (const s of PORTABILITY.caution) console.log(`  [要注意 ] ${s}`);

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 「夜間バッチで、50万行をなめて著者別の平均価格を出す。10秒待ってよい」
//       → routeTo は "prisma" と "bigquery" のどちらを返す?
//   (2) 「取り込み処理で Book を1件 upsert し、同時に IngestRun を1行足す。
//        片方だけ成功するのは許されない。読む行数は 500,000 行」
//       → needsTransaction が true で、かつ rowsScanned も巨大です。どちらになる?
//       そして、その判定は「設計として妥当」だと思いますか?
//   (3) 「1件だけ取るのに BigQuery を使うと何が困る?」を一言で。
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const nightlyBatch: Workload = {
  name: "夜間バッチ: 50万行から著者別平均価格",
  rowsScanned: 500_000,
  latencyBudgetMs: 10_000,
  needsTransaction: false,
};
console.log("変えてみる (1):", routeTo(nightlyBatch), "<-", nightlyBatch.name);

const bigTransaction: Workload = {
  name: "取り込み: Book upsert + IngestRun 追加(原子性が必要)",
  rowsScanned: 500_000,
  latencyBudgetMs: 5_000,
  needsTransaction: true,
};
console.log("変えてみる (2):", routeTo(bigTransaction), "<-", bigTransaction.name);
console.log("           (needsTransaction を false にすると →",
  routeTo({ ...bigTransaction, needsTransaction: false }), ")");

// STEP 4 の順序を入れ替えたら結果が変わる、ということは
// 「どの条件を最優先にするか」がそのまま設計判断だということです。
console.log("変えてみる (3): 1件取得を BigQuery でやると →", PROFILE.bigquery.badAt);

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の requirements(実際にこのコースで作る機能の一覧)を上から順に判定して、
//       それぞれの保存先を並べた配列 result1: Store[] を作ってください。
//       (routeTo をそのまま使ってよいし、自分の頭で判断して手で書いてもよい。
//        どちらでも同じ答えになるはずです — なるかどうかを確かめるのが今日の目的)
// ヒント(概念レベル): 配列 → 配列の変換は map(= LINQ の Select)。
const requirements: Workload[] = [
  { name: "画面の本一覧を20件表示(検索付き)", rowsScanned: 20, latencyBudgetMs: 200, needsTransaction: false },
  { name: "日別の取り込み件数を過去2年ぶん集計してダッシュボードに出す", rowsScanned: 2_000_000, latencyBudgetMs: 5_000, needsTransaction: false },
  { name: "取り込み時に Book を upsert しつつ IngestRun を1行足す(片方だけ成功は不可)", rowsScanned: 2, latencyBudgetMs: 500, needsTransaction: true },
  { name: "著者ごとの平均価格ランキングを月次レポートで出す", rowsScanned: 800_000, latencyBudgetMs: 30_000, needsTransaction: false },
  { name: "ユーザーがブックマークを1件追加する", rowsScanned: 1, latencyBudgetMs: 150, needsTransaction: false },
];

let result1: Store[] | null = null;
// ここに書く(result1 に代入する)

check("概念1: ワークロードの振り分け", result1,
  ["prisma", "bigquery", "prisma", "bigquery", "prisma"],
  "requirements.map((w) => routeTo(w)) で5件ぶんの配列になる。" +
  "実際が null なら未記入。3件目が bigquery になった人は needsTransaction の優先順位を見落としている" +
  "(原子性が要る処理は行数に関係なく OLTP 側)。" +
  "2件目/4件目が prisma になった人は rowsScanned のケタを見直す(10万行以上は集計=OLAP)");

export {};
