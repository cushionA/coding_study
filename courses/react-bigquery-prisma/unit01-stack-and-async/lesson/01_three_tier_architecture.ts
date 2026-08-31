/* =====================================================================
 * 概念1: 3層構成の地図と、越えてはいけない境界線
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   このコースで最終的に作るのは「外部APIからデータを取り込んで保存し、
 *   ブラウザの画面から検索できるWebアプリ」です。実務でこの手のアプリを
 *   組むとき、コードを1行書く前に必ず決めることが1つあります —
 *   「どこに何を置くか(境界線をどこに引くか)」です。
 *   ここを間違えると、動くけれど本番に出せないもの(= サービスアカウント鍵を
 *   全世界に配ってしまうアプリ)が出来上がります。逆にここさえ握っていれば、
 *   後続ユニットで出てくる React / Express / Prisma / BigQuery が
 *   「地図のどのマスの話か」で常に迷子にならずに済みます。
 *
 * ■ 解説(全体像):
 *
 *     外部API (取り込み元)
 *         │  fetch + zod検証 + リトライ            [unit02]
 *         ▼
 *     取り込みジョブ (Node/TypeScript)              [unit08]
 *         ├──▶ Prisma ──▶ アプリDB (SQLite)        [unit03/04] ← 正 (OLTP)。一覧・検索の本体
 *         └──▶ @google-cloud/bigquery ──▶ BigQuery [unit05]    ← 分析副本 (OLAP)。集計・履歴
 *
 *     ブラウザ (React + Vite)                       [unit07]
 *         │  fetch("/api/books?q=...")
 *         ▼
 *     バックエンドAPI (Express)                     [unit06]  ← 鍵・接続情報はここより内側だけ
 *         ├──▶ Prisma (検索・一覧)
 *         └──▶ BigQuery (集計サマリ)
 *
 *   登場人物を一言ずつ(名前だけ覚えればOK。中身は各ユニットでやります):
 *     React    — ブラウザの中で画面を組み立てるUIライブラリ。
 *     Express  — Node上でHTTPリクエストを受けて返す、自前サーバの枠組み。
 *                C# で言えば ASP.NET Core の Web API に相当。
 *     Prisma   — アプリDB(SQLite/Postgres)を型安全に読み書きするORM。
 *                C# で言えば EF Core(Code First + DbContext)。
 *     BigQuery — Googleの分析用データウェアハウス。集計専用の巨大な倉庫。
 *
 *   ■ 境界線の原則(このコースで最重要):
 *   「ブラウザに配られたJavaScriptは、全世界に公開されたのと同じ」。
 *   ブラウザで動くコードは、ユーザーが F12 を押せば中身も通信もすべて見えます。
 *   だからDBの接続文字列やGCPのサービスアカウント鍵をそこに書いた瞬間、
 *   その鍵は「公開」されたのと同義です。したがって:
 *
 *       許可される矢印:  ブラウザ → 自前バックエンド → データストア
 *       禁止される矢印:  ブラウザ → データストア(直結)
 *
 *   鍵と接続情報は「バックエンドより内側」にしか置きません。
 *   ブラウザは自分のサーバに用事を頼むだけ、というのが3層構成の意味です。
 *
 *   ■ TypeScript の5分復習(既習範囲。詰まったら別コース web-scraping-ts unit01 へ):
 *     ・型注釈       const n: number = 3;  function f(s: string): boolean
 *     ・配列メソッド  arr.map(x => ...)    = LINQ の Select
 *                    arr.filter(x => ...) = LINQ の Where
 *                    arr.find(x => ...)   = LINQ の FirstOrDefault(無ければ undefined)
 *     ・Record<K,V>  キー→値の辞書型。C# の Dictionary<K,V>
 *   今回はこの3つを、上の「地図」をデータとして表現するのに使います。
 *   新顔は2つだけ:
 *     ・ユニオン型   type Layer = "browser" | "backend" | "datastore"
 *                    「この3つの文字列のどれか」しか入らない型。C# の enum に近いが、
 *                    値の実体はただの文字列。打ち間違えた瞬間にエディタが赤線を出す。
 *     ・テンプレートリテラル  `${a}->${b}`  文字列に式を埋め込む。C# の $"{a}->{b}"
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
// GOAL: 3層構成を「型 + 配列 + Record」で表現し、鍵をどこに置けるかを機械的に判定する

// STEP 1: 層をユニオン型で定義する — 3つの文字列のどれかしか入らない
//   "browsr" のように打ち間違えると、実行前にエディタ/tsc が赤線で教えてくれる。
type Layer = "browser" | "backend" | "datastore";

// STEP 2: 各層の責務を Record<Layer, string> (= Dictionary<Layer, string>) で表現
//   Record のキーに Layer を使うと、3つ全部書かないとコンパイルエラーになる。
//   「層を1つ足したら全部の対応を見直させる」という安全装置になる。
const RESPONSIBILITY: Record<Layer, string> = {
  browser: "画面を描く。ユーザー操作を受ける。自分のサーバにだけ用事を頼む",
  backend: "認証・検証・集約。鍵を握ってデータストアと話す唯一の層",
  datastore: "データを保持する。Prisma(アプリDB)と BigQuery(分析)",
};
console.log("STEP 2: 各層の責務");
for (const layer of ["browser", "backend", "datastore"] as Layer[]) {
  console.log(`  ${layer.padEnd(10)} : ${RESPONSIBILITY[layer]}`);
}

// STEP 3: 「アプリが抱える資産」を配列で表現する。
//   safeIn は「この資産を置いてよい最も外側の層」。browser が最も外側、datastore が最も内側。
type Asset = { name: string; safeIn: Layer };
const assets: Asset[] = [
  { name: "本のタイトル一覧(表示用)", safeIn: "browser" },
  { name: "検索キーワード", safeIn: "browser" },
  { name: "GCPサービスアカウント鍵", safeIn: "backend" },
  { name: "DB接続文字列", safeIn: "backend" },
  { name: "外部APIのアクセストークン", safeIn: "backend" },
];

// STEP 4: filter で「ブラウザに出してはいけない資産」を抜き出し、map で名前だけにする
//   (C# なら assets.Where(a => a.safeIn != "browser").Select(a => a.name).ToArray())
const secretNames: string[] = assets
  .filter((a) => a.safeIn !== "browser")
  .map((a) => a.name);
console.log("STEP 4: ブラウザに出してはいけない資産 =", secretNames);

// STEP 5: 通信の矢印(エッジ)を表現して、許可されるものだけを通す
type Edge = { from: Layer; to: Layer };
const ALLOWED: Edge[] = [
  { from: "browser", to: "backend" },   // 画面 → 自前API。これは正しい
  { from: "backend", to: "datastore" }, // 自前API → DB/BigQuery。鍵を使うのはここだけ
];
function isAllowed(e: Edge): boolean {
  // find は「条件に合う最初の1件、無ければ undefined」。undefined でなければ許可。
  return ALLOWED.find((a) => a.from === e.from && a.to === e.to) !== undefined;
}
console.log("STEP 5: browser->backend は許可?  ", isAllowed({ from: "browser", to: "backend" }));
console.log("STEP 5: browser->datastore は許可?", isAllowed({ from: "browser", to: "datastore" }));

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) assets に { name: "画面のテーマ色設定", safeIn: "browser" } を足したら、
//       secretNames(ブラウザに出せない資産)の件数は増える? 変わらない?
//   (2) isAllowed({ from: "datastore", to: "browser" }) は true? false?
//       (DBが直接ブラウザに返事をする、という矢印です)
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const assets2: Asset[] = [...assets, { name: "画面のテーマ色設定", safeIn: "browser" }];
const secretNames2 = assets2.filter((a) => a.safeIn !== "browser").map((a) => a.name);
console.log("変えてみる (1): 資産の総数 =", assets2.length, "/ 秘密の件数 =", secretNames2.length);
console.log("変えてみる (2): datastore->browser は許可?", isAllowed({ from: "datastore", to: "browser" }));

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の proposedEdges(ある新人が書いた設計案の通信矢印リスト)から、
//       「禁止されている矢印」だけを `${from}->${to}` の形の文字列にして、
//       元の順番のまま配列 result1 に入れてください。
//       (許可の定義は STEP 5 の ALLOWED / isAllowed をそのまま使ってよい)
// ヒント(概念レベル): filter で許可されないものだけ残し、map でテンプレートリテラルの文字列にする。
const proposedEdges: Edge[] = [
  { from: "browser", to: "backend" },
  { from: "browser", to: "datastore" },
  { from: "backend", to: "datastore" },
  { from: "datastore", to: "browser" },
];

let result1: string[] | null = null;
// ここに書く(result1 に代入する)

check("概念1: 禁止された矢印の検出", result1, ["browser->datastore", "datastore->browser"],
  "proposedEdges.filter((e) => !isAllowed(e)) で絞ってから .map((e) => `${e.from}->${e.to}`)。" +
  "バッククォート文字列の中で ${} を使うと C# の $\"{a}->{b}\" と同じことができる");

export {};
