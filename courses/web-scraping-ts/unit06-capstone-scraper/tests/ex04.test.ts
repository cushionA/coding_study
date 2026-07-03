import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-capstone-scraper/ex04_capstone")
  : await import("../ex04_capstone");

const _testsDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.dirname(path.dirname(_testsDir));
const EXPECTED_CSV = path.join(_courseDir, "data", "site", "expected_catalog.csv");

function readCsvLines(filePath: string): string[] {
  return fs.readFileSync(filePath, "utf-8").trim().split("\n");
}

function tmpCsvPath(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ex04-")), "catalog.csv");
}

describe("isAllowed", () => {
  it("robots.txtでDisallowされていないパスをtrueとする", async () => {
    const robotsTxt = await ex.fetchLocal(ex.BASE_URL + "robots.txt");
    expect(ex.isAllowed(robotsTxt, ex.USER_AGENT, ex.BASE_URL + "list_page_1.html")).toBe(true);
  });

  it("Disallow配下のパスをfalseとする(境界値)", async () => {
    const robotsTxt = await ex.fetchLocal(ex.BASE_URL + "robots.txt");
    expect(ex.isAllowed(robotsTxt, ex.USER_AGENT, ex.BASE_URL + "admin/secret.html")).toBe(false);
  });
});

describe("collectAllItemLinks", () => {
  it("ページ移動のたびにsleepFnを呼ぶが、実際には待機しない(呼び出し回数だけ確認)", async () => {
    let calls = 0;
    const links = await ex.collectAllItemLinks(ex.BASE_URL + "list_page_1.html", async () => {
      calls += 1;
    });
    expect(links).toHaveLength(10);
    // 3ページ→2回のページ送りが発生する
    expect(calls).toBe(2);
  });
});

describe("fetchAndCleanAll", () => {
  it("取得できた分だけ整形済みオブジェクトを返し、失敗した1件はonErrorに通知してスキップする", async () => {
    const urls = [
      ex.BASE_URL + "item_1.html",
      ex.BASE_URL + "item_does_not_exist.html",
      ex.BASE_URL + "item_2.html",
    ];
    const errors: string[] = [];
    const rows = await ex.fetchAndCleanAll(
      urls,
      async () => {},
      1,
      (url) => errors.push(url),
    );
    expect(rows).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(ex.BASE_URL + "item_does_not_exist.html");
  });
});

describe("runPipeline", () => {
  it("許可されたURLからスタートすると全10件をCSVに書き出し、期待CSVと一致する(統合確認)", async () => {
    const outputPath = tmpCsvPath();
    const sleepCalls: Array<number | undefined> = [];
    const rows = await ex.runPipeline(
      ex.BASE_URL + "list_page_1.html",
      outputPath,
      async (delay) => {
        sleepCalls.push(delay);
      },
      1,
    );
    expect(rows).toHaveLength(10);
    expect(sleepCalls.length).toBeGreaterThan(0);

    const actual = readCsvLines(outputPath);
    const expected = readCsvLines(EXPECTED_CSV);
    expect(actual).toEqual(expected);
  });

  it("robots.txtで禁止されたURLから開始すると何も取得せずヘッダのみのCSVを書く", async () => {
    const outputPath = tmpCsvPath();
    const rows = await ex.runPipeline(
      ex.BASE_URL + "admin/secret.html",
      outputPath,
      async () => {},
      1,
    );
    expect(rows).toEqual([]);
    const actual = readCsvLines(outputPath);
    expect(actual).toEqual(["id,name,price,origin,roast,stock,description"]);
  });
});
