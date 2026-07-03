import { describe, it, expect, vi } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit05-robust-and-csv/ex02_error_handling")
  : await import("../ex02_error_handling");

// テストでは実際の待機は行わない。sleepFnは即座に解決するダミー、
// randomFnは決め打ちの値を返すダミーを注入する。
const noSleep = async (_ms: number): Promise<void> => {};
const zeroRandom = () => 0;

describe("computeBackoffMs", () => {
  it("attempt=0はbaseMsそのもの(ジッタ0のとき)", () => {
    expect(ex.computeBackoffMs(0, 100, zeroRandom)).toBe(100);
  });

  it("attemptが増えると指数的に増える(2^attempt倍)", () => {
    expect(ex.computeBackoffMs(2, 100, zeroRandom)).toBe(400);
  });

  it("ジッタが待ち時間に加算される", () => {
    expect(ex.computeBackoffMs(0, 100, () => 0.5)).toBe(150);
  });
});

describe("withRetry", () => {
  it("最初から成功すればリトライせずその値を返す", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await ex.withRetry(fn, 3, 10, noSleep, zeroRandom);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("2回失敗して3回目で成功すれば成功値を返す", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("一時的な失敗");
      return "recovered";
    });
    const result = await ex.withRetry(fn, 3, 10, noSleep, zeroRandom);
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("maxRetries回失敗し続けたら最後の例外を投げ直す", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("常に失敗"));
    await expect(ex.withRetry(fn, 2, 10, noSleep, zeroRandom)).rejects.toThrow("常に失敗");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

const parsers: import("../ex02_error_handling").FieldParsers = {
  parseName: (t) => t.trim(),
  parsePrice: (t) => (t === "bad" ? NaN : Number(t)),
  parseStock: (t) => (t === "bad" ? NaN : Number(t)),
  parseDate: (t) => t,
};

describe("cleanOneRecord", () => {
  it("正常なレコードをCleanRecordに変換する", () => {
    const raw = { name: "本A", price: "1000", stock: "5", date: "2026-01-01" };
    expect(ex.cleanOneRecord(raw, parsers)).toEqual({
      name: "本A", price: 1000, stock: 5, date: "2026-01-01",
    });
  });

  it("価格が不正なら価格に言及したメッセージの例外を投げる", () => {
    const raw = { name: "本B", price: "bad", stock: "5", date: "2026-01-01" };
    expect(() => ex.cleanOneRecord(raw, parsers)).toThrow("価格");
  });

  it("商品名が空なら商品名に言及したメッセージの例外を投げる(境界値)", () => {
    const raw = { name: "  ", price: "1000", stock: "5", date: "2026-01-01" };
    expect(() => ex.cleanOneRecord(raw, parsers)).toThrow("商品名");
  });
});

describe("cleanAllRecords", () => {
  it("不正な行をスキップして正常な行だけ返す", () => {
    const raws = [
      { name: "本A", price: "1000", stock: "5", date: "2026-01-01" },
      { name: "本B", price: "bad", stock: "5", date: "2026-01-01" },
      { name: "本C", price: "2000", stock: "3", date: "2026-01-02" },
    ];
    const result = ex.cleanAllRecords(raws, parsers);
    expect(result).toEqual([
      { name: "本A", price: 1000, stock: 5, date: "2026-01-01" },
      { name: "本C", price: 2000, stock: 3, date: "2026-01-02" },
    ]);
  });

  it("全件不正なら空配列(境界値)", () => {
    const raws = [{ name: "", price: "bad", stock: "bad", date: "" }];
    expect(ex.cleanAllRecords(raws, parsers)).toEqual([]);
  });
});
