// ex02_error_handling: 例外処理とリトライ(指数バックオフ+ジッタ)
// C#で言えば try/catch + Polly の Retry ポリシーに相当する処理を、外部ライブラリ無しで
// 自分で組み立てる。ネットワークやディスクの一時的な失敗は「少し待ってからもう一度」で
// 解決することが多いが、待ち時間を毎回同じにすると複数クライアントが一斉に再試行して
// サーバーを再び落とす「サンダリングハード問題」が起きる。そこで
// 「試行のたびに待ち時間を倍々に増やす(指数バックオフ)」+「毎回わずかにランダムなブレを
// 混ぜる(ジッタ)」という2つの工夫を組み合わせる。
// テストでは実際に何秒も待たせたくないので、sleep関数と乱数関数を「引数として注入」できる
// 形にしておく(C#のDIコンテナに時刻/乱数プロバイダを差し込むのと同じ発想)。

// 1件のレコード(価格・在庫は文字列のまま、まだクレンジング前)
export type RawRecord = {
  name: string;
  price: string;
  stock: string;
  date: string;
};

// クレンジング後のレコード(価格・在庫は数値になっている)
export type CleanRecord = {
  name: string;
  price: number;
  stock: number;
  date: string;
};

// 指数バックオフ+ジッタの待ち時間(ミリ秒)を計算する
// baseMs * 2^attempt に、0以上1未満の乱数(randomFnの戻り値)を使って
// 0〜baseMsのジッタを足す
// 例: attempt=0, baseMs=100, randomFn()が0を返すなら 100 * 2^0 + 0 = 100
//     attempt=2, baseMs=100, randomFn()が0を返すなら 100 * 2^2 + 0 = 400
export function computeBackoffMs(
  attempt: number,
  baseMs: number,
  randomFn: () => number,
): number {
  const exponential = baseMs * 2 ** attempt;
  const jitter = randomFn() * baseMs;
  return exponential + jitter;
}

// 非同期関数fnを実行し、失敗したら指数バックオフ+ジッタで待ってからリトライする
// - fnが成功したらその戻り値をそのまま返す
// - fnが投げた例外はmaxRetries回まで再試行してよい(合計で最大 maxRetries + 1 回実行)
// - リトライの直前にsleepFn(待ち時間ミリ秒)をawaitで呼ぶ(実際のsetTimeoutは使わない。
//   テストでは即座に解決するダミー関数が渡される)
// - maxRetries回失敗してもなお失敗したら、最後に発生した例外をそのまま投げ直す
// (C#の Polly.Retry(maxRetries).WaitAndRetryAsync(...) に相当する自前実装)
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseMs: number,
  sleepFn: (ms: number) => Promise<void>,
  randomFn: () => number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleepFn(computeBackoffMs(attempt, baseMs, randomFn));
      }
    }
  }
  throw lastError;
}

// 1件のRawRecordをクレンジングしてCleanRecordに変換する
// name/price/stock/dateのいずれかが不正(空文字・NaNになる等)な場合は例外を投げる
// (parsePrice/parseStock/parseName/parseDateは呼び出し側が渡すクレンジング関数を使う設計)
export type FieldParsers = {
  parseName: (text: string) => string;
  parsePrice: (text: string) => number;
  parseStock: (text: string) => number;
  parseDate: (text: string) => string;
};

// RawRecordを検証・変換し、不正なら理由付きのErrorを投げる。
// 成功したレコードはCleanRecordとして返す
export function cleanOneRecord(raw: RawRecord, parsers: FieldParsers): CleanRecord {
  const name = parsers.parseName(raw.name);
  const price = parsers.parsePrice(raw.price);
  const stock = parsers.parseStock(raw.stock);
  const date = parsers.parseDate(raw.date);

  if (name === "") throw new Error(`商品名が空です: ${JSON.stringify(raw)}`);
  if (Number.isNaN(price)) throw new Error(`価格が不正です: ${raw.price}`);
  if (Number.isNaN(stock)) throw new Error(`在庫数が不正です: ${raw.stock}`);

  return { name, price, stock, date };
}

// RawRecordの配列を1件ずつcleanOneRecordで処理し、成功したものだけを配列で返す
// 失敗した行はconsole.warnで警告を出してスキップする(例外で全体を止めない)
// (C#で言えば foreach 内で try/catch し、catch節でログを出してcontinueする形)
export function cleanAllRecords(raws: RawRecord[], parsers: FieldParsers): CleanRecord[] {
  const results: CleanRecord[] = [];
  for (const raw of raws) {
    try {
      results.push(cleanOneRecord(raw, parsers));
    } catch (err) {
      console.warn(`スキップ: ${(err as Error).message}`);
    }
  }
  return results;
}
