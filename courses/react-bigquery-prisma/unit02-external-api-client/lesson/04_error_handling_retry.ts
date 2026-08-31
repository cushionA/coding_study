/* =====================================================================
 * 概念4: 失敗の分類・リトライ(指数バックオフ+ジッタ)・タイムアウト
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   取り込みジョブは、たいてい人が寝ている時間に無人で走ります。
 *   そのとき相手のAPIが一瞬 503 を返しただけでジョブ全体が落ちると、
 *   翌朝「昨日のデータが無い」と言われます。逆に、何も考えずに
 *   ずっと再送し続けると、復旧しかけた相手を再び倒しますし、
 *   401(鍵が間違っている)を1万回投げても永遠に成功しません。
 *   つまり実務でやるべき判断は2つだけです:
 *     「この失敗は待てば直るのか、待っても直らないのか」
 *     「待つなら、どれくらい待って、何回で諦めるのか」
 *   これを決めて実装するのが、外部APIクライアントの仕上げです。
 *   unit08 の取り込みジョブは、この回で書くコードをそのまま使います。
 *
 * ■ 解説:
 *   ● 失敗の3分類
 *     (a) 通信自体が成立しなかった … 名前解決失敗・接続拒否・タイムアウト。
 *         このとき **fetch は例外を投げます**(unit01 でやった「404 や 500 では
 *         例外を投げない」の裏返し)。リクエストが相手に届いていない可能性が高いので
 *         → リトライ可。
 *     (b) 4xx = こちらのリクエストが悪い … 400(パラメータ不正)/ 401(鍵が違う)/
 *         403(権限が無い)/ 404(存在しない)。同じリクエストを何度送っても
 *         結果は同じ → 即座に諦める。ここでリトライするのは、相手に迷惑なだけでなく
 *         **バグの発見を遅らせる** ので実害があります。
 *         ただし例外が2つ: 408(リクエストタイムアウト)と 429(レート制限=
 *         「今は多すぎるから後で来て」)。この2つは待てば直るので → リトライ可。
 *     (c) 5xx = 相手が壊れている/混んでいる … 502/503/504 は再起動中や過負荷で
 *         数秒後には直っていることが多い → リトライ可。
 *
 *   ● 指数バックオフ(exponential backoff)
 *     一定間隔(毎回1秒)で再送すると、相手が復旧する前に叩き続けることになります。
 *     そこで待ち時間を 100ms → 200ms → 400ms → 800ms と倍々にして、
 *     相手に回復する時間を与えます。上限(cap)も必ず付けます。
 *     付けないと 2^10 秒 = 17分待つようなことになります。
 *
 *   ● ジッタ(jitter)= 待ち時間に乱数を混ぜる
 *     同じジョブが10プロセス動いていて、全部が同時に503を食らったとします。
 *     全員がまったく同じバックオフ計算をすると、**全員が同じ瞬間に再送** します。
 *     復旧しかけた相手はまた倒れます(thundering herd = 群衆殺到問題)。
 *     待ち時間を乱数で散らすだけでこれが防げます。
 *
 *   ● タイムアウト
 *     相手が「返事をしない」場合、await は永遠に返ってきません。ジョブは
 *     エラーも出さずに固まります。これを防ぐのが AbortSignal です。
 *       AbortSignal.timeout(ms)
 *         … 「ms ミリ秒後に中断せよ」という信号を出す AbortSignal を作る標準API。
 *       fetch(url, { signal })
 *         … 第2引数(RequestInit)に signal を渡すと、中断信号が出た瞬間に
 *           その fetch が **例外で終わります**。エラーの name は "TimeoutError"。
 *     C# で言えば new CancellationTokenSource(TimeSpan.FromSeconds(5)).Token を
 *     HttpClient.SendAsync に渡すのと同じ。AbortSignal は unit07 の React でも
 *     再登場します(画面から消えたコンポーネントの通信をキャンセルする用途)。
 *
 *   ● リトライしてよいのは「何度やっても同じ結果になる」操作だけ
 *     GET は何度投げても安全です(冪等)。POST の再送は二重登録を生みかねません。
 *     この問題は unit04 の upsert(同じデータを何回入れても1行のまま)で解決します。
 *
 *   ■ このファイルで使う新しい構文:
 *     ・class FatalHttpError extends Error { }
 *          … 独自の例外クラス。C# の `class FooException : Exception` と同じ。
 *            catch の中で `err instanceof FatalHttpError` と書けば、
 *            例外の種類で分岐できます(C# の catch (FooException) 相当)。
 *     ・2 ** n … べき乗演算子。Math.pow(2, n) と同じ。
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
// GOAL: 「503 は待って再試行 / 404 は即中止 / 返事が来ないなら打ち切る」を
//       1つの関数の中で動かし、実際に何回呼ばれたかを数えて確かめる。

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// STEP 1: 部品を3つ用意する
function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

//   独自例外: 「これはリトライしても無駄」という意思をコードで表現する
class FatalHttpError extends Error {}

//   ステータスコードを3分類する(このファイルの前半で使う簡易版。
//   429/408 の例外扱いは「書いてみる」で自分で足してもらいます)
function classifyStatus(status: number): "success" | "retryable" | "fatal" {
  if (status >= 200 && status < 300) return "success";
  if (status >= 500) return "retryable";
  return "fatal";
}

//   待ち時間 = base * 2^attempt の半分〜満額の間からランダムに選ぶ(half jitter)
function backoffWithJitter(attempt: number, baseMs: number, capMs: number): number {
  const full = Math.min(baseMs * 2 ** attempt, capMs);
  return Math.round(full / 2 + Math.random() * (full / 2));
}

// STEP 2: 台本どおりに応答するダミー fetch(呼ばれた回数を数える)
//   台本を使い切ったら最後の応答を繰り返す。"network-error" は通信断のつもり。
function makeScriptedFetch(script: Array<number | "network-error">) {
  let calls = 0;
  const fetchFn: FetchLike = async (_url, _init) => {
    calls++;
    const step = script[Math.min(calls - 1, script.length - 1)]!;
    if (step === "network-error") throw new TypeError("fetch failed"); // 本物の fetch もこの形で失敗する
    return Response.json({ books: ["吾輩は猫である"], statusEcho: step }, { status: step });
  };
  return { fetchFn, getCalls: () => calls };
}

// STEP 3: 本体。分類 → 待つ → 再試行、を上限回数まで繰り返す
type RetryOptions = { maxAttempts: number; baseMs: number; capMs: number; timeoutMs: number };

async function fetchWithRetry(fetchFn: FetchLike, url: string, opts: RetryOptions): Promise<Response> {
  let lastReason = "";
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      // タイムアウト信号を毎回作り直す(使い回すと2回目以降は最初から期限切れ)
      const res = await fetchFn(url, { signal: AbortSignal.timeout(opts.timeoutMs) });
      const kind = classifyStatus(res.status);
      console.log(`    試行${attempt + 1}: status=${res.status} → ${kind}`);
      if (kind === "success") return res;
      if (kind === "fatal") throw new FatalHttpError(`回復不能な失敗 (status=${res.status})`);
      lastReason = `status=${res.status}`;
    } catch (err) {
      if (err instanceof FatalHttpError) throw err; // 諦めるべき失敗はここで打ち切る
      // ここに来るのは「通信が成立しなかった」か「タイムアウトした」— どちらもリトライ可
      const e = err as Error;
      console.log(`    試行${attempt + 1}: 例外 ${e.name}(${e.message}) → retryable`);
      lastReason = e.name;
    }
    if (attempt < opts.maxAttempts - 1) {
      const wait = backoffWithJitter(attempt, opts.baseMs, opts.capMs);
      console.log(`    → ${wait}ms 待って再試行`);
      await sleep(wait);
    }
  }
  throw new Error(`${opts.maxAttempts}回試して諦めました (最後の理由: ${lastReason})`);
}

const OPTS: RetryOptions = { maxAttempts: 3, baseMs: 20, capMs: 200, timeoutMs: 100 };

// STEP 4: 2回失敗してから復活するAPI → 3回目で成功する
console.log("STEP 4: 503, 503, 200 の順に返すAPI");
const flaky = makeScriptedFetch([503, 503, 200]);
const okRes = await fetchWithRetry(flaky.fetchFn, "http://api.example.test/books", OPTS);
console.log("STEP 4: 成功 status =", okRes.status, "/ 呼び出し回数 =", flaky.getCalls(),
  "/ 本文 =", await okRes.json());

// STEP 5: 404 → 待たずに1回で諦める(ここでリトライしないのが実務的に重要)
console.log("STEP 5: 404 を返すAPI");
const missing = makeScriptedFetch([404]);
try {
  await fetchWithRetry(missing.fetchFn, "http://api.example.test/nope", OPTS);
} catch (err) {
  console.log("STEP 5: 中止 →", (err as Error).message, "/ 呼び出し回数 =", missing.getCalls());
}

// STEP 6: 通信断 → 5xx → 5xx。上限まで試して、最後は例外で終わる
console.log("STEP 6: 通信断のあとずっと 500 のAPI");
const broken = makeScriptedFetch(["network-error", 500]);
try {
  await fetchWithRetry(broken.fetchFn, "http://api.example.test/books", OPTS);
} catch (err) {
  console.log("STEP 6: 断念 →", (err as Error).message, "/ 呼び出し回数 =", broken.getCalls());
}

// STEP 7: 返事が返ってこないAPI → AbortSignal.timeout が打ち切る
//   このダミーは「300ms 後に応答する。ただし中断信号が来たら即座に失敗する」— 本物の fetch と同じ振る舞い。
console.log("STEP 7: 300ms 返事をしないAPI(タイムアウトは 100ms)");
let slowCalls = 0;
const slowFetch: FetchLike = (_url, init) =>
  new Promise<Response>((resolve, reject) => {
    slowCalls++;
    const timer = setTimeout(() => resolve(Response.json({ late: true })), 300);
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(init.signal!.reason); // AbortSignal.timeout の reason は name が "TimeoutError" の例外
    });
  });
try {
  await fetchWithRetry(slowFetch, "http://api.example.test/slow", { ...OPTS, maxAttempts: 2 });
} catch (err) {
  console.log("STEP 7: 断念 →", (err as Error).message, "/ 呼び出し回数 =", slowCalls);
}

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に予測してください:
//   (1) 常に 500 を返すAPIに maxAttempts=4 で挑んだら、fetch は何回呼ばれる?
//       そして「待つ」のは何回?(呼び出し回数と待機回数は同じ? 1つ違う?)
//   (2) 常に 429(レート制限)を返すAPIだと、上の classifyStatus では何回呼ばれる?
//       それは正しい振る舞い? — 429 の意味を思い出してください。
//   (3) backoffWithJitter(2, 100, 5000) を5回続けて呼んだら、5つとも同じ値になる?
//       だいたいどのあたりの数値になる?
// 予測をメモしてから実行 → 下の出力と照合してください。

// --- 変えてみる ---------------------------------------------------------
const always500 = makeScriptedFetch([500]);
try {
  await fetchWithRetry(always500.fetchFn, "http://api.example.test/books",
    { maxAttempts: 4, baseMs: 10, capMs: 100, timeoutMs: 100 });
} catch (err) {
  console.log("変えてみる (1): 呼び出し回数 =", always500.getCalls(), "/", (err as Error).message);
}

const always429 = makeScriptedFetch([429]);
try {
  await fetchWithRetry(always429.fetchFn, "http://api.example.test/books",
    { maxAttempts: 4, baseMs: 10, capMs: 100, timeoutMs: 100 });
} catch (err) {
  console.log("変えてみる (2): 呼び出し回数 =", always429.getCalls(), "/", (err as Error).message);
}
console.log("変えてみる (2): ↑ 429 は「今は混んでいるから後で来て」なので、本当は待って再試行すべき失敗です");

console.log("変えてみる (3): ジッタ入りの待ち時間5回 =",
  [0, 0, 0, 0, 0].map(() => backoffWithJitter(2, 100, 5000)));

// --- 書いてみる ---------------------------------------------------------
// 課題A: classifyStatus2(status) を書いてください。上の簡易版に、実務のルールを足します。
//        ・200〜299 → "success"
//        ・408(リクエストタイムアウト)と 429(レート制限)→ "retryable"
//        ・それ以外の 400〜499 → "fatal"
//        ・500 以上 → "retryable"
//        ・それ以外(想定外の値)→ "fatal"
// 課題B: backoffMs(attempt) を書いてください。attempt は 0 から始まります。
//        ・基準 100ms、試行ごとに2倍(100, 200, 400, 800, 1600, ...)
//        ・ただし上限は 800ms(それを超えたら 800 のまま)
//        ・ジッタ(乱数)はここでは入れない — 演習 ex03 で足します
// ヒント(概念レベル): A は if を上から順に並べるだけ。特別扱いする2つを先に書くのがコツ。
//   B は「べき乗」と「小さいほうを採る関数」の組み合わせで1行になります。
function classifyStatus2(status: number): "success" | "retryable" | "fatal" | null {
  // ここに書く(分類を表す文字列を return する。書けたら下の「未実装の目印」の行は消す)
  return null; // 未実装の目印
}

function backoffMs(attempt: number): number | null {
  // ここに書く(待ち時間のミリ秒を return する。書けたら下の「未実装の目印」の行は消す)
  return null; // 未実装の目印
}

const result4a = [200, 404, 408, 429, 503, 401].map((s) => classifyStatus2(s));
const result4b = [0, 1, 2, 3, 4].map((a) => backoffMs(a));

check("概念4-A: 失敗の分類", result4a,
  ["success", "fatal", "retryable", "retryable", "retryable", "fatal"],
  "null が並ぶ → 未実装。408/429 が \"fatal\" → 4xx をまとめて弾く前に、この2つを先に判定する。" +
  "401 が \"retryable\" → 4xx の既定は fatal。200 が \"fatal\" → 2xx の判定が抜けている");

check("概念4-B: 指数バックオフ(上限つき)", result4b, [100, 200, 400, 800, 800],
  "null が並ぶ → 未実装。[100,200,400,800,1600] → 上限(cap)を掛けていない。" +
  "[200,400,...] → attempt が 0 始まりであることを忘れている(2 ** 0 は 1)。" +
  "小数が出る → Math.min の引数の順番か、掛け算の対象を確認");

export {};

/* =====================================================================
 * 振り返り(自分の言葉で1〜2文 — このコメントを編集して書き込んでください)
 * ---------------------------------------------------------------------
 * ・今日学んだことを自分の言葉で:
 * ・難しかったこと(あれば):
 *
 * (この記述はセッション終了時にチューターが学習ノートとスキルレベル判定に使います)
 * ===================================================================== */

/* =====================================================================
 * まとめと次へ
 * ---------------------------------------------------------------------
 * 概念                一言で                                          C# で言うと
 * 型は実行時に消える   型注釈も as も実行時には存在しない。外から来た    Unsafe.As<T>(検査ゼロ)
 *                      値の出発点は Book ではなく unknown              ※ (Book)obj とは違う
 * APIクライアント      通信の詳細を1モジュールに閉じ込め、外には         IBookApiClient +
 *                      「本をください」だけ見せる。fetch は引数で        BookApiClient、
 *                      受け取る(注入)のでテストが通信不要になる         HttpClient の DI
 * zod / safeParse     スキーマを1つ書けば、実行時検証と TS の型         DataAnnotations +
 *                      (z.infer)の両方が手に入る。失敗は issues の      TryValidateObject
 *                      path/code で「どこが・なぜ」まで分かる           (ただし型は生えない)
 * nullable / optional null を許すのか、キーの欠落を許すのか は別物       string?(区別が無い)
 * DTO → ドメイン      境界で1回だけ翻訳する(腐敗防止層)。命名・平坦化  DTO → Entity の
 *                      ・「無い」の統一・型の昇格・導出値の5仕事         Mapper / AutoMapper
 * 失敗の3分類          通信断=リトライ可 / 4xx=即中止(408・429 は例外) HttpRequestException と
 *                      / 5xx=リトライ可                                 ステータス判定の使い分け
 * バックオフ+ジッタ    倍々に待って上限で止める。乱数で散らして群衆殺到   Polly の
 *                      を防ぐ                                           WaitAndRetryAsync
 * タイムアウト         AbortSignal.timeout(ms) を fetch に渡す。        CancellationTokenSource
 *                      返事が来ない相手で固まらないための保険            (TimeSpan)
 *
 * この先どこで使うか:
 * ・unit03(次)/unit04: 今日 toBook で作った「内側の形」が、そのまま
 *   schema.prisma の model Book になります。externalId は @unique を付けて
 *   upsert の突合キーにします — 「取り込みを何回走らせても行が増えない」を
 *   作るための伏線が、今日の変換関数にもう入っています。
 *   Prisma は EF Core の Code First にあたるもので、次回はまず
 *   「Prisma(アプリDB=OLTP)と BigQuery(分析=OLAP)はそもそも解く問題が違う」
 *   という役割分担から始めます。
 * ・unit05: BigQuery のクライアントも同じく「注入できる形」で書きます。
 *   部分失敗(一部の行だけ入らない)という、今日の分類の応用問題が出てきます。
 *   日付を Date に昇格させておいたのは、BigQuery の TIMESTAMP 型に渡すためです。
 * ・unit06: zod がもう一度出ます。今度は「外部API → 自分」ではなく
 *   「ブラウザ → 自分」の入口で、不正なリクエストに 400 を返すために使います。
 * ・unit07/08: AbortSignal が React の useEffect で再登場します。
 *   そして今日のリトライ付きクライアントが、取り込みジョブの心臓部になります。
 *
 * 次: 演習へ。lesson を見ながらで OK。
 *   ex01_parse_response … 生 JSON を安全に受け取る(概念1)
 *   ex02_zod_schema     … スキーマ定義と検証、DTO→ドメイン変換(概念2・3)
 *   ex03_retry_timeout  … 分類・バックオフ・タイムアウト(概念4)
 *   ex04_capstone       … 4つを1本のAPIクライアントに束ねる
 *   テストは cwd を courses/react-bigquery-prisma/ にして:
 *     npx vitest run unit02-external-api-client/tests
 * ===================================================================== */
