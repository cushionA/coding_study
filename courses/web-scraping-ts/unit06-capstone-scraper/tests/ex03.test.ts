import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-capstone-scraper/ex03_pipeline_integrate")
  : await import("../ex03_pipeline_integrate");

describe("stripLabel", () => {
  it("「ラベル: 値」から値だけを取り出す", () => {
    expect(ex.stripLabel("産地: エチオピア")).toBe("エチオピア");
  });

  it("コロンが無ければそのまま返す(境界値)", () => {
    expect(ex.stripLabel("在庫あり")).toBe("在庫あり");
  });
});

describe("priceToNumber", () => {
  it("円記号を除去してnumberにする", () => {
    expect(ex.priceToNumber("1200円")).toBe(1200);
  });
});

describe("cleanItem", () => {
  it("生のオブジェクトをidつきの整形済みオブジェクトに変換する", () => {
    const raw = {
      name: "エチオピア モカ",
      price: "1200円",
      origin: "産地: エチオピア",
      roast: "焙煎度: 浅煎り",
      stock: "在庫あり",
      description: "説明文",
    };
    const result = ex.cleanItem(1, raw);
    expect(result).toEqual({
      id: 1,
      name: "エチオピア モカ",
      price: 1200,
      origin: "エチオピア",
      roast: "浅煎り",
      stock: "在庫あり",
      description: "説明文",
    });
  });
});

describe("writeCatalogCsv", () => {
  it("ヘッダ+データ行をUTF-8で書き出す", () => {
    const rows = [
      { id: 1, name: "エチオピア モカ", price: 1200, origin: "エチオピア",
        roast: "浅煎り", stock: "在庫あり", description: "説明文" },
    ];
    const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ex03-")), "out.csv");
    ex.writeCatalogCsv(rows, outputPath);

    const content = fs.readFileSync(outputPath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[0]).toBe("id,name,price,origin,roast,stock,description");
    expect(lines[1]).toBe("1,エチオピア モカ,1200,エチオピア,浅煎り,在庫あり,説明文");
  });

  it("カンマを含む値はダブルクォートで囲む(エッジケース)", () => {
    const rows = [
      { id: 1, name: "豆, 特選", price: 500, origin: "日本",
        roast: "深煎り", stock: "在庫あり", description: "濃い味" },
    ];
    const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ex03-")), "out.csv");
    ex.writeCatalogCsv(rows, outputPath);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content).toContain('"豆, 特選"');
  });
});
