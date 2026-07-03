import { describe, it, expect } from "vitest";
import { makeOkResponse, makeRateLimitedResponse } from "../../data/fakeResponses";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-fetch-and-manners/ex03_rate_limit")
  : await import("../ex03_rate_limit");

// setTimeoutの代わりに「何秒待とうとしたか」を記録するだけのダミー(実際には待たない)
function makeSleepRecorder(): { calls: number[]; sleep: (seconds: number) => Promise<void> } {
  const calls: number[] = [];
  return {
    calls,
    sleep: async (seconds: number) => {
      calls.push(seconds);
    },
  };
}

describe("waitIfNeeded", () => {
  it("経過時間が足りなければ不足分だけsleepFuncを呼ぶ", async () => {
    const recorder = makeSleepRecorder();
    const waited = await ex.waitIfNeeded(10.0, 9.5, 2.0, recorder.sleep);
    expect(waited).toBe(1.5);
    expect(recorder.calls).toEqual([1.5]);
  });

  it("十分に間隔が空いていればsleepFuncを呼ばない(エッジケース)", async () => {
    const recorder = makeSleepRecorder();
    const waited = await ex.waitIfNeeded(10.0, 5.0, 2.0, recorder.sleep);
    expect(waited).toBe(0);
    expect(recorder.calls).toEqual([]);
  });
});

describe("handleRateLimit", () => {
  it("429応答ならRetry-Afterの秒数だけ待ち、trueを返す", async () => {
    const recorder = makeSleepRecorder();
    const response = makeRateLimitedResponse(7);
    const shouldRetry = await ex.handleRateLimit(response, recorder.sleep);
    expect(shouldRetry).toBe(true);
    expect(recorder.calls).toEqual([7]);
  });

  it("200応答なら何もせずfalseを返す", async () => {
    const recorder = makeSleepRecorder();
    const response = makeOkResponse("body");
    const shouldRetry = await ex.handleRateLimit(response, recorder.sleep);
    expect(shouldRetry).toBe(false);
    expect(recorder.calls).toEqual([]);
  });
});

describe("fetchAllWithDelay", () => {
  it("複数URLを順番に取得し、2件目以降の前にだけ待つ", async () => {
    const recorder = makeSleepRecorder();
    const urls = ["a", "b", "c"];
    const clockValues = [0.0, 0.0, 0.2, 0.2, 0.5, 0.5];
    let clockIndex = 0;
    const clockFunc = () => clockValues[clockIndex++];
    const fetchFunc = async (url: string) => `body-of-${url}`;

    const results = await ex.fetchAllWithDelay(urls, fetchFunc, 1.0, recorder.sleep, clockFunc);

    expect(results).toEqual(["body-of-a", "body-of-b", "body-of-c"]);
    // 1件目の前には待たない、2件目・3件目の前には不足分を待つ
    expect(recorder.calls.length).toBe(2);
  });
});
