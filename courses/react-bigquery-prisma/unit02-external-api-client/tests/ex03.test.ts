import { describe, it, expect } from "vitest";
import type { FetchLike } from "../ex03_retry_timeout";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit02-external-api-client/ex03_retry_timeout")
  : await import("../ex03_retry_timeout");

describe("shouldRetry", () => {
  it("429(レート制限)はリトライ対象", () => {
    expect(ex.shouldRetry(429)).toBe(true);
  });

  it("500〜599(サーバエラー)はリトライ対象、599は境界値", () => {
    expect(ex.shouldRetry(500)).toBe(true);
    expect(ex.shouldRetry(599)).toBe(true);
  });

  it("404はリトライしない(こちらのリクエストが悪い)", () => {
    expect(ex.shouldRetry(404)).toBe(false);
  });

  it("200(成功)はリトライしない(境界値)", () => {
    expect(ex.shouldRetry(200)).toBe(false);
  });
});

describe("computeBackoffDelay", () => {
  const noJitter = { randomFn: () => 0 };

  it("attempt=0はbaseMsそのまま(ジッタなし)", () => {
    expect(ex.computeBackoffDelay(0, noJitter)).toBe(100);
  });

  it("attempt=2は指数的に増える(base*2^attempt)", () => {
    expect(ex.computeBackoffDelay(2, noJitter)).toBe(400);
  });

  it("maxMsで頭打ちになる(境界値)", () => {
    expect(ex.computeBackoffDelay(10, { ...noJitter, maxMs: 5000 })).toBe(5000);
  });

  it("randomFnが1のときjitterRatio分だけ上乗せされる", () => {
    const result = ex.computeBackoffDelay(0, { randomFn: () => 1, jitterRatio: 0.5 });
    expect(result).toBe(150);
  });
});

// signalがabortされたら失敗する、タイムアウトの動作を模した疑似fetch。
// resolveDelayMs経過前にabortされなければ200で解決する。
function timeoutProneFetch(resolveDelayMs: number): FetchLike {
  return (_url: string, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(new Response(null, { status: 200 }));
      }, resolveDelayMs);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
}

describe("fetchWithTimeout", () => {
  it("タイムアウトより先に応答が来れば成功する", async () => {
    const response = await ex.fetchWithTimeout(timeoutProneFetch(5), "/x", 50);
    expect(response.status).toBe(200);
  });

  it("応答よりタイムアウトが先ならタイムアウトのErrorをthrowする", async () => {
    await expect(ex.fetchWithTimeout(timeoutProneFetch(50), "/x", 5)).rejects.toThrow(
      /タイムアウト/,
    );
  });

  it("AbortError以外のエラーはそのまま伝播する", async () => {
    const brokenFetch: FetchLike = async () => {
      throw new Error("boom");
    };
    await expect(ex.fetchWithTimeout(brokenFetch, "/x", 50)).rejects.toThrow(/boom/);
  });
});

function fakeFetchOk<T>(data: T): FetchLike {
  return async () => new Response(JSON.stringify(data), { status: 200 });
}

// 呼ばれるたびに配列先頭のstatusを1つずつ消費して返すfetch。
function fakeFetchSequence(statuses: number[], okBody: unknown): FetchLike {
  const queue = [...statuses];
  return async () => {
    const status = queue.length > 1 ? queue.shift()! : queue[0];
    if (status >= 200 && status <= 299) {
      return new Response(JSON.stringify(okBody), { status });
    }
    return new Response(null, { status });
  };
}

const noSleep = async () => {};

describe("fetchWithRetry", () => {
  it("最初の試行で成功すればそのままjsonを返す", async () => {
    const result = await ex.fetchWithRetry(fakeFetchOk({ ok: true }), "/x", { sleepFn: noSleep });
    expect(result).toEqual({ ok: true });
  });

  it("1回目が500で2回目に成功したら結果を返す(リトライ成功)", async () => {
    const fetchFn = fakeFetchSequence([500, 200], { id: 1 });
    const result = await ex.fetchWithRetry(fetchFn, "/x", { maxAttempts: 2, sleepFn: noSleep });
    expect(result).toEqual({ id: 1 });
  });

  it("404はリトライせず即座にErrorをthrowする", async () => {
    let callCount = 0;
    const fetchFn: FetchLike = async () => {
      callCount++;
      return new Response(null, { status: 404 });
    };
    await expect(
      ex.fetchWithRetry(fetchFn, "/x", { maxAttempts: 3, sleepFn: noSleep }),
    ).rejects.toThrow(/404/);
    expect(callCount).toBe(1);
  });

  it("リトライ可能でも試行回数を使い切ったらErrorをthrowする", async () => {
    let callCount = 0;
    const fetchFn: FetchLike = async () => {
      callCount++;
      return new Response(null, { status: 500 });
    };
    await expect(
      ex.fetchWithRetry(fetchFn, "/x", { maxAttempts: 2, sleepFn: noSleep }),
    ).rejects.toThrow(/500/);
    expect(callCount).toBe(2);
  });
});
