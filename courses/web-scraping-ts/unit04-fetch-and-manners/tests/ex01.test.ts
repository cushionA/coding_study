import { describe, it, expect } from "vitest";
import { FakeResponse, makeOkResponse, makeNotFoundResponse, makeRateLimitedResponse } from "../../data/fakeResponses";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-fetch-and-manners/ex01_handle_response")
  : await import("../ex01_handle_response");

describe("getBodyIfOk", () => {
  it("200応答ならtext()の結果をそのまま返す", async () => {
    const response = makeOkResponse("<h1>hello</h1>");
    await expect(ex.getBodyIfOk(response)).resolves.toBe("<h1>hello</h1>");
  });

  it("404応答ならnullを返す(エッジケース)", async () => {
    const response = makeNotFoundResponse();
    await expect(ex.getBodyIfOk(response)).resolves.toBeNull();
  });
});

describe("getContentType", () => {
  it("Content-Typeヘッダがあればその値を返す", () => {
    const response = makeOkResponse("<p>x</p>");
    expect(ex.getContentType(response)).toBe("text/html; charset=utf-8");
  });

  it("ヘッダが無いレスポンスでは\"unknown\"を返す(エッジケース)", () => {
    const noHeaderResponse = new FakeResponse(200, "x");
    expect(ex.getContentType(noHeaderResponse)).toBe("unknown");
  });
});

describe("countByStatus", () => {
  it("複数レスポンスのstatusごとの件数を数える", () => {
    const responses = [makeOkResponse("a"), makeOkResponse("b"), makeNotFoundResponse()];
    expect(ex.countByStatus(responses)).toEqual({ 200: 2, 404: 1 });
  });

  it("空配列なら空のRecordを返す(境界値)", () => {
    expect(ex.countByStatus([])).toEqual({});
  });
});

describe("getBodyOrThrow", () => {
  it("成功時はtext()の結果を返す", async () => {
    const response = makeOkResponse("body-text");
    await expect(ex.getBodyOrThrow(response)).resolves.toBe("body-text");
  });

  it("429など失敗時はResponseErrorをstatus付きで送出する", async () => {
    const response = makeRateLimitedResponse(3);
    await expect(ex.getBodyOrThrow(response)).rejects.toMatchObject({
      name: "ResponseError",
      status: 429,
    });
  });
});
