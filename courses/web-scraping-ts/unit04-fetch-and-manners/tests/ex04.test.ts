import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeOkResponse, makeNotFoundResponse, makeRateLimitedResponse } from "../../data/fakeResponses";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-fetch-and-manners/ex04_capstone")
  : await import("../ex04_capstone");

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const _dataDir = path.join(_testDir, "..", "..", "data");

function loadRobotsText(): string {
  return fs.readFileSync(path.join(_dataDir, "example_robots.txt"), "utf-8");
}

function loadOkHtml(): string {
  return fs.readFileSync(path.join(_dataDir, "response_ok.html"), "utf-8");
}

function makeSleepRecorder(): { calls: number[]; sleep: (seconds: number) => Promise<void> } {
  const calls: number[] = [];
  return {
    calls,
    sleep: async (seconds: number) => {
      calls.push(seconds);
    },
  };
}

describe("getBodyWithRetry", () => {
  it("200応答ならそのままtext()を返す(再取得しない)", async () => {
    const recorder = makeSleepRecorder();
    const html = loadOkHtml();
    const response = makeOkResponse(html);
    const fetchFunc = async () => {
      throw new Error("成功時はfetchFuncを呼び直すべきではない");
    };

    const result = await ex.getBodyWithRetry(response, fetchFunc, recorder.sleep);
    expect(result).toBe(html);
    expect(recorder.calls).toEqual([]);
  });

  it("429なら1回だけ待って再取得し、成功すればその本文を返す", async () => {
    const recorder = makeSleepRecorder();
    const html = loadOkHtml();
    const firstResponse = makeRateLimitedResponse(4);
    const fetchFunc = async () => makeOkResponse(html);

    const result = await ex.getBodyWithRetry(firstResponse, fetchFunc, recorder.sleep);
    expect(result).toBe(html);
    expect(recorder.calls).toEqual([4]);
  });

  it("404など429以外の失敗はnullを返す(例外を投げない)", async () => {
    const recorder = makeSleepRecorder();
    const response = makeNotFoundResponse();
    const fetchFunc = async () => {
      throw new Error("404はリトライ対象ではない");
    };

    const result = await ex.getBodyWithRetry(response, fetchFunc, recorder.sleep);
    expect(result).toBeNull();
    expect(recorder.calls).toEqual([]);
  });
});

describe("fetchIfAllowed", () => {
  it("robots.txtで禁止されたパスは取得を試みずnullを返す", async () => {
    const recorder = makeSleepRecorder();
    const rules = ex.buildRobotsRules(loadRobotsText());
    const fetchFunc = async (): Promise<never> => {
      throw new Error("禁止パスではfetchFuncを呼ぶべきではない");
    };

    const result = await ex.fetchIfAllowed(rules, "*", "/admin/secret", fetchFunc, recorder.sleep);
    expect(result).toBeNull();
    expect(recorder.calls).toEqual([]);
  });

  it("許可されたパスなら取得して本文を返す(統合確認)", async () => {
    const recorder = makeSleepRecorder();
    const rules = ex.buildRobotsRules(loadRobotsText());
    const html = loadOkHtml();
    const fetchFunc = async () => makeOkResponse(html);

    const result = await ex.fetchIfAllowed(rules, "*", "/public/page", fetchFunc, recorder.sleep);
    expect(result).toBe(html);
  });
});
