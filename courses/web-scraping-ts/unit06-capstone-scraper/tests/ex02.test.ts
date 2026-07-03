import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit06-capstone-scraper/ex02_fetch_details")
  : await import("../ex02_fetch_details");

describe("parseItemDetail", () => {
  it("生テキストのまま各フィールドをオブジェクトに詰める", async () => {
    const html = await ex.fetchLocal(ex.BASE_URL + "item_1.html");
    const detail = ex.parseItemDetail(html);
    expect(detail.name).toBe("エチオピア モカ");
    expect(detail.price).toBe("1200円");
    expect(detail.origin).toBe("産地: エチオピア");
    expect(detail.roast).toBe("焙煎度: 浅煎り");
    expect(detail.stock).toBe("在庫あり");
    expect(detail.description).toContain("モカ");
  });

  it("在庫切れの商品でも同じキー構成で取得できる(エッジケース)", async () => {
    const html = await ex.fetchLocal(ex.BASE_URL + "item_3.html");
    const detail = ex.parseItemDetail(html);
    expect(detail.stock).toBe("在庫切れ");
    expect(detail.name).toBe("グアテマラ アンティグア");
  });
});

describe("fetchAllItemDetails", () => {
  it("渡した順序を保って複数件をまとめて返す", async () => {
    const urls = [ex.BASE_URL + "item_1.html", ex.BASE_URL + "item_2.html"];
    const details = await ex.fetchAllItemDetails(urls);
    expect(details).toHaveLength(2);
    expect(details[0].name).toBe("エチオピア モカ");
    expect(details[1].name).toBe("ブラジル サントス");
  });

  it("空配列なら空配列を返す(境界値)", async () => {
    expect(await ex.fetchAllItemDetails([])).toEqual([]);
  });
});
