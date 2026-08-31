/* =====================================================================
 * 概念2: Promise と async/await(= C# の Task<T> と await)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   概念1の地図に出てきた矢印は、全部「待ち時間のある処理」です。
 *   外部APIを叩けば返事が来るまで数百ミリ秒、DBに問い合わせれば数ミリ秒、
 *   BigQueryに集計を投げれば数秒。JavaScript/Node はこれらを
 *   「待っている間もスレッドを止めない」やり方でしか書けません。
 *   つまり、このコースで書くコードの大半は非同期関数になります。
 *   ここを曖昧にしたまま先に進むと、後続ユニット全部で「なぜか undefined」
 *   「なぜか Promise が表示される」に延々と悩むことになります。逆にここを
 *   押さえれば、C# 経験者にとっては既知の世界に入ります。
 *
 * ■ 解説:
 *   TypeScript の Promise<T> は、C# の Task<T> とほぼ同じものだと思って
 *   構いません。「今はまだ無いが、いずれ T が入る(か、失敗する)入れ物」です。
 *
 *       TypeScript                        C#
 *       Promise<number>                   Task<int>
 *       async function f(): Promise<T>    async Task<T> F()
 *       await p                           await p
 *       Promise.all([a, b])               Task.WhenAll(a, b)
 *       new Promise(res => setTimeout(res, 100))   Task.Delay(100)
 *       p.catch(...) / try-catch          try-catch
 *
 *   覚えることは4つだけです:
 *
 *   (1) async を付けた関数は、必ず Promise を返す。
 *       `async function f(): Promise<number> { return 3; }` は 3 ではなく
 *       「3が入った Promise」を返す。C# の async Task<int> と完全に同じ。
 *
 *   (2) await は Promise の中身を取り出す。取り出せるまで、その関数の続きは待つ。
 *       await は async 関数の中でしか書けない…というのが元々の規則ですが、
 *       ESM(このコースの構成)ではファイルのトップレベルでも await が書けます。
 *
 *   (3) await を付け忘れると、中身ではなく Promise オブジェクトそのものが流れる。
 *       これが最頻出バグです。C# なら「非同期メソッドの結果を await していない」と
 *       コンパイラが警告してくれますが、TypeScript は型が Promise<number> になるだけで、
 *       console.log や `as any` を経由すると気づかないまま NaN や undefined になります。
 *
 *   (4) Promise は「失敗」も表現する。失敗した Promise を await すると例外が飛ぶので、
 *       try/catch で捕まえる。C# の await した Task が例外を投げるのと同じ挙動です。
 *
 *   このファイルで使う新しいAPI:
 *     ・setTimeout(fn, ms)  … ms ミリ秒後に fn を呼ぶ、Node/ブラウザ組み込みの関数。
 *     ・new Promise<T>(resolve => ...)  … 自前で Promise を作る書き方。
 *          resolve(値) を呼んだ瞬間にその Promise は「成功して値が入った」状態になる。
 *          C# の TaskCompletionSource<T>.SetResult(値) に相当。
 *     ・Promise.all(配列)  … 配列内の Promise を「同時に走らせて」全部揃うのを待ち、
 *          結果を同じ順序の配列で返す。C# の Task.WhenAll。1つでも失敗すると全体が失敗。
 *     ・Date.now()  … 現在時刻をミリ秒の数値で返す。所要時間の計測に使う。
 * ===================================================================== */

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
// GOAL: async 関数が返すのは「値」ではなく Promise であること、await で中身が出ること、
//       付け忘れると何が壊れるか、そして Promise.all で待ち時間が縮むことを目で見る

// STEP 1: sleep — ms ミリ秒待つだけの Promise を作る(C# の Task.Delay(ms))
//   new Promise の中の resolve を setTimeout 経由で呼ぶと、「ms 後に成功する Promise」になる。
function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// STEP 2: 「時間のかかるデータ取得」を模した async 関数。
//   本物では fetch や Prisma の呼び出しが入る場所。今は sleep で待ち時間だけ再現する。
async function fetchPrice(book: string): Promise<number> {
  await sleep(60); // 60ms かかる通信のつもり
  const table: Record<string, number> = { 猫: 780, 銀河: 640, 坊っちゃん: 520 };
  return table[book] ?? 0;
}

// STEP 3: await せずに呼ぶと何が返るか、目で見る
const notAwaited = fetchPrice("猫"); // ← await が無い
console.log("STEP 3: await 無しの戻り値 =", notAwaited);
console.log("STEP 3: その typeof     =", typeof notAwaited, "/ Promiseか =", notAwaited instanceof Promise);
// 数値のつもりで計算すると壊れる。C# で Task<int> を int のつもりで足すようなもの。
console.log("STEP 3: 数値として足すと =", (notAwaited as unknown as number) + 100);

// STEP 4: await を付けると中身(数値)が出てくる
const price = await fetchPrice("猫");
console.log("STEP 4: await 有りの戻り値 =", price, "/ typeof =", typeof price);
console.log("STEP 4: 数値として足すと   =", price + 100);

// STEP 5: 逐次(1つずつ await)と 並行(Promise.all)の所要時間を比べる
const t0 = Date.now();
const a = await fetchPrice("猫");        // 60ms 待つ
const b = await fetchPrice("銀河");      // 終わってからさらに 60ms
const c = await fetchPrice("坊っちゃん"); // さらに 60ms
const serialMs = Date.now() - t0;
console.log(`STEP 5: 逐次   結果=[${a}, ${b}, ${c}] 所要=${serialMs}ms`);

const t1 = Date.now();
const [d, e, f] = await Promise.all([
  fetchPrice("猫"),
  fetchPrice("銀河"),
  fetchPrice("坊っちゃん"),
]); // 3つ同時に走らせて、全部揃うのを待つ(= Task.WhenAll)
const parallelMs = Date.now() - t1;
console.log(`STEP 5: 並行   結果=[${d}, ${e}, ${f}] 所要=${parallelMs}ms`);

// STEP 6: 失敗する Promise は await した時点で例外になる → try/catch で捕まえる
async function fetchStrict(book: string): Promise<number> {
  await sleep(10);
  const table: Record<string, number> = { 猫: 780 };
  const found = table[book];
  if (found === undefined) throw new Error(`在庫にない本です: ${book}`);
  return found;
}
try {
  await fetchStrict("存在しない本");
} catch (err) {
  console.log("STEP 6: catch できた →", (err as Error).message);
}

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) Promise.all を使わず、5件を1つずつ await したら所要時間は約何ms?
//       Promise.all で5件同時にしたら約何ms?(sleep は 1件 60ms)
//   (2) 5件のうち1件だけが必ず失敗するとき、Promise.all 全体はどうなる?
//       「失敗した1件以外の4件の結果」は受け取れる? それとも全体が例外になる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const books5 = ["猫", "銀河", "坊っちゃん", "猫", "銀河"];

const t2 = Date.now();
const serialResults: number[] = [];
for (const bk of books5) {
  serialResults.push(await fetchPrice(bk)); // 1件ずつ順番に待つ
}
console.log(`変えてみる (1) 逐次5件: ${JSON.stringify(serialResults)} 所要=${Date.now() - t2}ms`);

const t3 = Date.now();
const parallelResults = await Promise.all(books5.map((bk) => fetchPrice(bk)));
console.log(`変えてみる (1) 並行5件: ${JSON.stringify(parallelResults)} 所要=${Date.now() - t3}ms`);

try {
  const mixed = await Promise.all([fetchStrict("猫"), fetchStrict("幻の本"), fetchStrict("猫")]);
  console.log("変えてみる (2) 全部成功:", mixed);
} catch (err) {
  console.log("変えてみる (2) Promise.all は →", (err as Error).message);
}

// --- 書いてみる ---------------------------------------------------------
// 課題: 下の fetchStock(倉庫への在庫問い合わせのつもり。1件 40ms かかる)を使って、
//       ids の3件を「並行に」問い合わせ、在庫数の合計を result2 に入れてください。
//       (逐次でも合計値は同じになりますが、ここでは Promise.all を使うこと。
//        出力される所要時間が 120ms 側か 40ms 側かで、並行になったか分かります)
// ヒント(概念レベル): ids.map(...) で「Promise の配列」を作り、それを Promise.all に渡して
//   await する。合計は for...of か reduce で足す。await の付け忘れに注意(合計が NaN や
//   "[object Promise]" になったらそれが原因)。
async function fetchStock(id: string): Promise<number> {
  await sleep(40);
  const table: Record<string, number> = { "bk-1": 12, "bk-2": 5, "bk-3": 8 };
  return table[id] ?? 0;
}
const ids = ["bk-1", "bk-2", "bk-3"];

const t4 = Date.now();
let result2: number | null = null;
// ここに書く(result2 に在庫数の合計を代入する)

console.log(`(参考)書いてみるブロックの所要時間: ${Date.now() - t4}ms`);

check("概念2: Promise.all で並行取得して合計", result2, 25,
  "const stocks = await Promise.all(ids.map((id) => fetchStock(id))); のあと " +
  "let sum = 0; for (const s of stocks) sum += s; で合計する。" +
  "実際が null なら未記入、NaN なら await 忘れ、配列なら合計し忘れ");

export {};
