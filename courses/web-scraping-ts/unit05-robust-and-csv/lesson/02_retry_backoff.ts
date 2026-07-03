/* =====================================================================
 * 概念2: 例外処理とリトライ(指数バックオフ+ジッタ)
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   実務のスクレイピングでは、一時的なネットワークエラーやサーバー側の
 *   混雑で通信が失敗することが日常的に起きます。1回失敗しただけで
 *   処理全体を諦めるのはもったいなく、「少し待ってからもう一度」だけで
 *   多くは解決します。C#では Polly ライブラリの Retry ポリシーがこれを
 *   やってくれますが、考え方自体は自分で実装できます。
 *
 * ■ 解説:
 *   単純に「毎回1秒待ってリトライ」だと、サーバーが混雑から回復する前に
 *   大量のクライアントが一斉に再試行して再び落とす、ということが起きます。
 *   これを避けるための2つの工夫:
 *
 *     - 指数バックオフ: 待ち時間を 1回目=100ms, 2回目=200ms, 3回目=400ms...
 *       と倍々に増やす(サーバーに回復の時間を多く与える)
 *     - ジッタ: 待ち時間に少しランダムな“ブレ”を足す(全クライアントが
 *       綺麗に同じタイミングで再試行するのを防ぐ)
 *
 *   TypeScriptの try/catch は C# の try/catch とほぼ同じ構文です。
 *   async関数内で await した処理が失敗(Promiseがreject)すると、
 *   その場で catch に処理が飛びます(C# の await + try/catch で
 *   Task が例外を投げるのと同じ)。
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
// GOAL: 指数バックオフの「倍々に増える」感覚と、try/catchでの失敗ハンドリングを見る

console.log("--- STEP 1: 指数バックオフの増え方(ジッタなし) ---");
const baseMs = 100;
for (let attempt = 0; attempt < 4; attempt++) {
  const waitMs = baseMs * 2 ** attempt;
  console.log(`attempt ${attempt}: ${waitMs}ms 待つ`);
}

console.log("--- STEP 2: try/catchで例外を捕まえる ---");
function riskyOperation(shouldFail: boolean): string {
  if (shouldFail) throw new Error("一時的な失敗");
  return "成功";
}
try {
  console.log(riskyOperation(true));
} catch (err) {
  console.log("catchで捕まえた:", (err as Error).message);
}

console.log("--- STEP 3: async関数内でのtry/catch ---");
async function fetchSomething(shouldFail: boolean): Promise<string> {
  if (shouldFail) throw new Error("通信エラー");
  return "データ取得成功";
}
async function demoAsyncCatch() {
  try {
    const result = await fetchSomething(true);
    console.log(result);
  } catch (err) {
    console.log("非同期処理のcatchで捕まえた:", (err as Error).message);
  }
}
await demoAsyncCatch();

// --- 予測してみよう -----------------------------------------------------
// 次のブロックは「2回失敗して3回目で成功する」処理を、手動のループでリトライします。
// 実行前に予測: 何回ループが回り、最終的な結果は何になるでしょうか?
console.log("--- 予測してみよう ---");
let callCount = 0;
async function flakyOperation(): Promise<string> {
  callCount += 1;
  if (callCount < 3) throw new Error(`${callCount}回目は失敗`);
  return "3回目でついに成功";
}
async function manualRetryDemo() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await flakyOperation();
      console.log(`attempt ${attempt}: 成功 ->`, result);
      return;
    } catch (err) {
      console.log(`attempt ${attempt}: 失敗 -> ${(err as Error).message}`);
    }
  }
}
await manualRetryDemo();

// --- 書いてみる ---------------------------------------------------------
// 課題: attempt=3, baseMs=50 のときの指数バックオフの待ち時間(ジッタなし)を
//       result2 に入れてください(期待値: 50 * 2^3 = 400)。
// ヒント(概念レベル): STEP 1 と同じ「baseMs * 2 の attempt乗」の式
let result2: number | null = null;
// ここに書く(result2 に代入する)

check("概念2: 指数バックオフの計算", result2, 400,
  "baseMs * 2 ** attempt という式で計算する(50 * 2の3乗 = 400)");

export {};
