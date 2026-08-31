import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-stack-and-async/ex01_promise_basics")
  : await import("../ex01_promise_basics");

describe("wait", () => {
  it("Promise<void> を返す(C#のTask.Delayに相当)", () => {
    const p = ex.wait(5);
    expect(p).toBeInstanceOf(Promise);
  });

  it("指定ミリ秒後にresolveし、値はundefinedになる", async () => {
    const result = await ex.wait(5);
    expect(result).toBeUndefined();
  });
});

describe("doubleAfterDelay", () => {
  it("待った後にn*2を返す", async () => {
    const result = await ex.doubleAfterDelay(3, 5);
    expect(result).toBe(6);
  });

  it("0は0のまま(境界値)", async () => {
    const result = await ex.doubleAfterDelay(0, 5);
    expect(result).toBe(0);
  });

  it("負の数も掛け算どおりに扱える", async () => {
    const result = await ex.doubleAfterDelay(-4, 5);
    expect(result).toBe(-8);
  });
});

// タスクの「呼び出しタイミング」を記録するための計測用ヘルパー。
// 実行順序を見れば「1件ずつ順番に」か「全部同時に」かを判別できる。
function makeTrackedTask(id: number, delayMs: number, log: string[]): () => Promise<number> {
  return () =>
    new Promise<number>((resolve) => {
      log.push(`call:${id}`);
      setTimeout(() => {
        log.push(`resolve:${id}`);
        resolve(id);
      }, delayMs);
    });
}

describe("runInSeries", () => {
  it("空配列を渡すと空配列が返る(境界値)", async () => {
    const result = await ex.runInSeries([]);
    expect(result).toEqual([]);
  });

  it("入力順のまま結果を集める", async () => {
    const tasks = [1, 2, 3].map((n) => () => Promise.resolve(n * 10));
    const result = await ex.runInSeries(tasks);
    expect(result).toEqual([10, 20, 30]);
  });

  it("前のタスクがresolveするまで次のタスクを呼び出さない(逐次実行)", async () => {
    const log: string[] = [];
    const tasks = [
      makeTrackedTask(1, 5, log),
      makeTrackedTask(2, 5, log),
    ];
    await ex.runInSeries(tasks);
    // call:2 は resolve:1 の後でなければならない
    expect(log).toEqual(["call:1", "resolve:1", "call:2", "resolve:2"]);
  });
});

describe("runInParallel", () => {
  it("空配列を渡すと空配列が返る(境界値)", async () => {
    const result = await ex.runInParallel([]);
    expect(result).toEqual([]);
  });

  it("入力順のまま結果を返す(解決順ではない)", async () => {
    const tasks = [
      () => ex.doubleAfterDelay(1, 20),
      () => ex.doubleAfterDelay(2, 5),
      () => ex.doubleAfterDelay(3, 10),
    ];
    const result = await ex.runInParallel(tasks);
    expect(result).toEqual([2, 4, 6]);
  });

  it("すべてのタスクをほぼ同時に呼び出す(並行実行)", async () => {
    const log: string[] = [];
    const tasks = [
      makeTrackedTask(1, 5, log),
      makeTrackedTask(2, 5, log),
    ];
    await ex.runInParallel(tasks);
    // 両方とも「呼び出し」が先に並び、resolveより後にならない
    expect(log[0]).toBe("call:1");
    expect(log[1]).toBe("call:2");
  });
});
