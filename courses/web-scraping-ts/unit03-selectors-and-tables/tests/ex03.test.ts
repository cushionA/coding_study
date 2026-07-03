import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit03-selectors-and-tables/ex03_records_cleanup")
  : await import("../ex03_records_cleanup");

function loadMessyHtml(): string {
  return ex.readFixture("messy_list.html");
}

describe("toEventRecord", () => {
  it("titleとdateが両方揃っている要素はそのまま取り出す", () => {
    const $ = cheerio.load(loadMessyHtml());
    const first = $("li.event, li.event-item").get(0);
    const result = ex.toEventRecord($, first!);
    expect(result).toEqual({ title: "読書会: 海外文学の夜", date: "2026-07-12" });
  });

  it("date要素が存在しない場合は不明を入れる(欠損)", () => {
    const $ = cheerio.load(loadMessyHtml());
    const second = $("li.event, li.event-item").get(1);
    const result = ex.toEventRecord($, second!);
    expect(result).toEqual({ title: "古書修繕ワークショップ", date: "不明" });
  });

  it("date要素はあるがテキストが空文字の場合も不明を入れる(境界値)", () => {
    const $ = cheerio.load(loadMessyHtml());
    const last = $("li.event, li.event-item").get(4);
    const result = ex.toEventRecord($, last!);
    expect(result).toEqual({ title: "著者トークイベント", date: "不明" });
  });
});

describe("parseEvents", () => {
  it("class揺れ(event/event-item)を横断して5件すべて取得する", () => {
    const html = loadMessyHtml();
    const result = ex.parseEvents(html);
    expect(result).toHaveLength(5);
    expect(result[2]).toEqual({ title: "絵本の読み聞かせ会", date: "2026-07-20" });
    expect(result[3]).toEqual({ title: "不明", date: "2026-07-27" });
  });
});

describe("sortedKnownDates", () => {
  it("dateが不明の項目を除外し日付昇順で返す", () => {
    const html = loadMessyHtml();
    const events = ex.parseEvents(html);
    const result = ex.sortedKnownDates(events);
    expect(result.map((e) => e.date)).toEqual(["2026-07-12", "2026-07-20", "2026-07-27"]);
  });

  it("全件不明なら空配列(境界値)", () => {
    const events = [{ title: "a", date: "不明" }, { title: "b", date: "不明" }];
    expect(ex.sortedKnownDates(events)).toEqual([]);
  });
});
