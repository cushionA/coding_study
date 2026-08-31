// ex03_retry_timeout: 失敗の分類・指数バックオフ・タイムアウト
// 外部APIへのリクエストが失敗したとき、すべてを同じように扱ってはいけない。
// 404(こちらが存在しないリソースを指定した)はいくら再試行しても直らないので
// 即座に諦めるべきだが、429(相手のレート制限)や5xx(相手側の一時的な障害)は
// 少し待ってからもう一度試す価値がある。この「待ってからもう一度」を
// 指数バックオフ(待ち時間を試行のたびに倍にしていく)+ジッタ(ランダムな
// ばらつきを混ぜて複数クライアントが一斉に再試行してしまう事故を防ぐ)で実装する。
// タイムアウトはC#の CancellationTokenSource.CancelAfter に相当する
// AbortSignal(期限付きで自動的にabortする AbortSignal.timeout)を使う。

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

// HTTPステータスコードから「もう一度試す価値があるか」を判定する。
// 429(レート制限)と5xx(サーバ側の一時的な問題)はリトライ対象、
// それ以外(4xxのその他=こちらのリクエストが悪い、2xx/3xxは成功)はリトライしない。
export function shouldRetry(status: number): boolean {
  // TODO: status が 429、または 500〜599 の範囲なら true、それ以外は false を返す
  throw new Error("TODO: 未実装");
}

export type BackoffOptions = {
  baseMs?: number; // 1回目の待ち時間の基準値(既定100ms)
  maxMs?: number; // 待ち時間の上限(既定5000ms)
  jitterRatio?: number; // 上乗せするジッタの最大割合、0〜1(既定0.5)
  randomFn?: () => number; // 0以上1未満の乱数源(テストでは固定値を注入する)
};

// attempt(0始まりの試行回数)から待ち時間(ms)を計算する。
// base * 2^attempt を土台にし、maxMsで頭打ちにしたうえで、
// 0〜jitterRatio倍のランダムな時間を上乗せする。
export function computeBackoffDelay(attempt: number, options: BackoffOptions = {}): number {
  // TODO: options から baseMs(既定100)・maxMs(既定5000)・jitterRatio(既定0.5)・
  // randomFn(既定Math.random)を取り出し(??で既定値を補う)、
  // exponential = Math.min(base * 2 ** attempt, max) を計算、
  // jitter = exponential * jitterRatio * randomFn() を足して
  // Math.round(exponential + jitter) を返す
  throw new Error("TODO: 未実装");
}

// fetchFnをtimeoutMsでタイムアウトさせる。C#の
// cts.CancelAfter(timeoutMs) を付けてHttpClientを呼ぶのに相当する。
export async function fetchWithTimeout(
  fetchFn: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  // TODO: fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) }) を try で呼ぶ。
  // catch した error の name が "AbortError" なら、タイムアウトした旨を
  // 伝える Error(timeoutMs を含める)を throw する。それ以外の error は
  // そのまま re-throw する
  throw new Error("TODO: 未実装");
}

export type RetryOptions = {
  maxAttempts?: number; // 初回呼び出しを含む最大試行回数(既定3)
  backoff?: BackoffOptions;
  sleepFn?: (ms: number) => Promise<void>; // 待機処理(テストでは即座に終わるダミーを注入する)
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// fetchFnでurlを取得し、失敗時はリトライ可能なステータスなら
// 指数バックオフで待ってから再試行する。json()の結果をTとして返す。
export async function fetchWithRetry<T>(
  fetchFn: FetchLike,
  url: string,
  options: RetryOptions = {},
): Promise<T> {
  // TODO: maxAttempts(既定3)回まで、次を繰り返すループを書く:
  //   ① fetchFn(url) を await する
  //   ② response.ok なら (await response.json()) を T として return する
  //   ③ !response.ok のとき、shouldRetry(response.status) が false か、
  //     すでに最後の試行なら、status と試行回数を含む Error を throw する
  //   ④ それ以外(まだリトライできる)なら computeBackoffDelay(attempt, options.backoff)
  //     の結果を sleepFn(既定はdefaultSleep) で待ってから次の試行へ進む
  throw new Error("TODO: 未実装");
}
