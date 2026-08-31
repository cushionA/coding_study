import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-stack-and-async/ex03_env_config")
  : await import("../ex03_env_config");

const TEST_KEYS = ["TEST_STR_KEY", "API_KEY", "API_BASE_URL", "API_TIMEOUT_MS", "TEST_INT_KEY"];
const originalValues = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of TEST_KEYS) {
    originalValues.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of TEST_KEYS) {
    const original = originalValues.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

describe("getEnvOrDefault", () => {
  it("未設定ならdefaultValueを返す", () => {
    expect(ex.getEnvOrDefault("TEST_STR_KEY", "デフォルト")).toBe("デフォルト");
  });

  it("設定されていればその値を返す", () => {
    process.env.TEST_STR_KEY = "実際の値";
    expect(ex.getEnvOrDefault("TEST_STR_KEY", "デフォルト")).toBe("実際の値");
  });

  it("空文字列が設定されている場合はデフォルトにせずそのまま返す(境界値)", () => {
    process.env.TEST_STR_KEY = "";
    expect(ex.getEnvOrDefault("TEST_STR_KEY", "デフォルト")).toBe("");
  });
});

describe("getRequiredEnv", () => {
  it("設定されていれば値を返す", () => {
    process.env.API_KEY = "sk-test-123";
    expect(ex.getRequiredEnv("API_KEY")).toBe("sk-test-123");
  });

  it("未設定ならErrorをthrowする", () => {
    expect(() => ex.getRequiredEnv("API_KEY")).toThrow(/API_KEY/);
  });

  it("空文字列でもErrorをthrowする(境界値)", () => {
    process.env.API_KEY = "";
    expect(() => ex.getRequiredEnv("API_KEY")).toThrow(/API_KEY/);
  });
});

describe("parsePositiveIntEnv", () => {
  it("未設定ならdefaultValueを返す", () => {
    expect(ex.parsePositiveIntEnv("API_TIMEOUT_MS", 5000)).toBe(5000);
  });

  it("正の整数文字列は数値として返す", () => {
    process.env.API_TIMEOUT_MS = "1500";
    expect(ex.parsePositiveIntEnv("API_TIMEOUT_MS", 5000)).toBe(1500);
  });

  it("数値でない文字列はErrorをthrowする", () => {
    process.env.API_TIMEOUT_MS = "abc";
    expect(() => ex.parsePositiveIntEnv("API_TIMEOUT_MS", 5000)).toThrow(/API_TIMEOUT_MS/);
  });

  it("0以下はErrorをthrowする(境界値)", () => {
    process.env.API_TIMEOUT_MS = "0";
    expect(() => ex.parsePositiveIntEnv("API_TIMEOUT_MS", 5000)).toThrow(/API_TIMEOUT_MS/);
  });
});

describe("loadApiConfig", () => {
  it("API_KEYがあれば各項目を正しく組み立てる", () => {
    process.env.API_KEY = "sk-test-999";
    const config = ex.loadApiConfig();
    expect(config).toEqual({
      baseUrl: "http://localhost:4010",
      apiKey: "sk-test-999",
      timeoutMs: 5000,
    });
  });

  it("API_KEYが未設定ならErrorをthrowする(秘密情報は必須)", () => {
    expect(() => ex.loadApiConfig()).toThrow(/API_KEY/);
  });
});
