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
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  return false;
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
  const base = options.baseMs ?? 100;
  const max = options.maxMs ?? 5000;
  const jitterRatio = options.jitterRatio ?? 0.5;
  const randomFn = options.randomFn ?? Math.random;

  const exponential = Math.min(base * 2 ** attempt, max);
  const jitter = exponential * jitterRatio * randomFn();
  return Math.round(exponential + jitter);
}

// fetchFnをtimeoutMsでタイムアウトさせる。C#の
// cts.CancelAfter(timeoutMs) を付けてHttpClientを呼ぶのに相当する。
export async function fetchWithTimeout(
  fetchFn: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${url} が ${timeoutMs}ms でタイムアウトしました`);
    }
    throw error;
  }
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
  const maxAttempts = options.maxAttempts ?? 3;
  const sleepFn = options.sleepFn ?? defaultSleep;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchFn(url);
    if (response.ok) {
      return (await response.json()) as T;
    }
    const isLastAttempt = attempt === maxAttempts - 1;
    if (!shouldRetry(response.status) || isLastAttempt) {
      throw new Error(
        `${url} の取得に失敗しました (status: ${response.status}, attempts: ${attempt + 1})`,
      );
    }
    await sleepFn(computeBackoffDelay(attempt, options.backoff));
  }
  // ここには到達しないが、TypeScriptの型チェック上すべての経路でreturn/throwが要る
  throw new Error(`${url} の取得に失敗しました (attempts: ${maxAttempts})`);
}
