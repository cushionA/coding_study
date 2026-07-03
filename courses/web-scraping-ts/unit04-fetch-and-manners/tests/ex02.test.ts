import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit04-fetch-and-manners/ex02_robots_parser")
  : await import("../ex02_robots_parser");

const _testDir = path.dirname(fileURLToPath(import.meta.url));
const _dataDir = path.join(_testDir, "..", "..", "data");

function loadRobotsText(): string {
  return fs.readFileSync(path.join(_dataDir, "example_robots.txt"), "utf-8");
}

describe("parseRobotsTxt", () => {
  it("robots.txtからUser-agentごとのルールMapを構築できる", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(rules.has("*")).toBe(true);
    expect(rules.has("MyScraperBot")).toBe(true);
    expect(rules.has("BadBot")).toBe(true);
  });
});

describe("canFetch", () => {
  it("\"*\"向けには/admin/配下が禁止されている", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(ex.canFetch(rules, "*", "/admin/secret")).toBe(false);
  });

  it("\"*\"向けでも許可されているパスはtrue", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(ex.canFetch(rules, "*", "/public/page")).toBe(true);
  });

  it("MyScraperBot向けには/private/reports/以下だけ個別に許可されている(エッジケース)", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(ex.canFetch(rules, "MyScraperBot", "/private/reports/x")).toBe(true);
  });

  it("BadBotは全面的に禁止されている", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(ex.canFetch(rules, "BadBot", "/anything")).toBe(false);
  });
});

describe("getCrawlDelay", () => {
  it("\"*\"向けのCrawl-delayは2秒", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(ex.getCrawlDelay(rules, "*")).toBe(2);
  });

  it("MyScraperBot向けは個別に1秒が指定されている", () => {
    const rules = ex.parseRobotsTxt(loadRobotsText());
    expect(ex.getCrawlDelay(rules, "MyScraperBot")).toBe(1);
  });

  it("未知のUser-Agentかつ\"*\"も無ければdefaultDelayを返す(境界値)", () => {
    const rules = ex.parseRobotsTxt("User-agent: OnlyThisBot\nDisallow: /x/\n");
    expect(ex.getCrawlDelay(rules, "SomeoneElse", 5)).toBe(5);
  });
});
